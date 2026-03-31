const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time }   = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultPledge", function () {
  let contract;
  let owner, creator, pledger1, pledger2, stranger;
  const GOAL = ethers.parseEther("1");
  const DAYS = 7;

  beforeEach(async () => {
    [owner, creator, pledger1, pledger2, stranger] = await ethers.getSigners();
    contract = await (await ethers.getContractFactory("VaultPledge")).deploy();
  });

  async function makeVault(o = {}) {
    const tx = await contract.connect(creator).createVault(
      o.title ?? "Test Vault", o.desc ?? "desc",
      o.goal  ?? GOAL,         o.days ?? DAYS
    );
    const r = await tx.wait();
    const log = r.logs.map(l => { try { return contract.interface.parseLog(l); } catch { return null; } }).find(l => l?.name === "VaultCreated");
    return log.args.id;
  }

  // ── createVault ─────────────────────────────────────────────────────────────
  describe("createVault()", () => {
    it("TC-01 | stores all fields correctly", async () => {
      const id = await makeVault({ title: "My Fund" });
      const v  = await contract.getVault(id);
      expect(v.title).to.equal("My Fund");
      expect(v.goal).to.equal(GOAL);
      expect(v.raised).to.equal(0n);
      expect(v.released).to.be.false;
      expect(v.exists).to.be.true;
    });

    it("TC-02 | emits VaultCreated event", async () => {
      await expect(
        contract.connect(creator).createVault("X","y", GOAL, DAYS)
      ).to.emit(contract, "VaultCreated");
    });

    it("TC-03 | increments vaultCount", async () => {
      await makeVault(); await makeVault();
      expect(await contract.vaultCount()).to.equal(2n);
    });

    it("TC-04 | reverts GoalMustBePositive", async () => {
      await expect(contract.connect(creator).createVault("X","y",0,DAYS))
        .to.be.revertedWithCustomError(contract, "GoalMustBePositive");
    });

    it("TC-05 | reverts DurationMustBePositive", async () => {
      await expect(contract.connect(creator).createVault("X","y",GOAL,0))
        .to.be.revertedWithCustomError(contract, "DurationMustBePositive");
    });

    it("TC-06 | reverts TitleRequired", async () => {
      await expect(contract.connect(creator).createVault("","y",GOAL,DAYS))
        .to.be.revertedWithCustomError(contract, "TitleRequired");
    });
  });

  // ── pledge ───────────────────────────────────────────────────────────────────
  describe("pledge()", () => {
    let id;
    beforeEach(async () => { id = await makeVault(); });

    it("TC-07 | updates raised + pledge mapping + emits Pledged", async () => {
      const amt = ethers.parseEther("0.5");
      await expect(contract.connect(pledger1).pledge(id, { value: amt }))
        .to.emit(contract, "Pledged").withArgs(id, pledger1.address, amt);
      expect((await contract.getVault(id)).raised).to.equal(amt);
      expect(await contract.getPledge(id, pledger1.address)).to.equal(amt);
    });

    it("TC-08 | accumulates from multiple pledgers", async () => {
      await contract.connect(pledger1).pledge(id, { value: ethers.parseEther("0.6") });
      await contract.connect(pledger2).pledge(id, { value: ethers.parseEther("0.4") });
      expect(await contract.isGoalMet(id)).to.be.true;
    });

    it("TC-09 | reverts ZeroPledge", async () => {
      await expect(contract.connect(pledger1).pledge(id, { value: 0 }))
        .to.be.revertedWithCustomError(contract, "ZeroPledge");
    });

    it("TC-10 | reverts DeadlinePassed", async () => {
      await time.increase(DAYS * 86400 + 1);
      await expect(contract.connect(pledger1).pledge(id, { value: ethers.parseEther("0.1") }))
        .to.be.revertedWithCustomError(contract, "DeadlinePassed");
    });

    it("TC-11 | reverts VaultNotFound for bad ID", async () => {
      await expect(contract.connect(pledger1).pledge(999, { value: ethers.parseEther("0.1") }))
        .to.be.revertedWithCustomError(contract, "VaultNotFound");
    });
  });

  // ── release ───────────────────────────────────────────────────────────────────
  describe("release()", () => {
    let id;
    beforeEach(async () => {
      id = await makeVault();
      await contract.connect(pledger1).pledge(id, { value: GOAL });
      await time.increase(DAYS * 86400 + 1);
    });

    it("TC-12 | sends ETH to creator + marks released", async () => {
      const before = await ethers.provider.getBalance(creator.address);
      const tx     = await contract.connect(creator).release(id);
      const rcpt   = await tx.wait();
      const gas    = rcpt.gasUsed * rcpt.gasPrice;
      expect(await ethers.provider.getBalance(creator.address)).to.equal(before + GOAL - gas);
      expect((await contract.getVault(id)).released).to.be.true;
    });

    it("TC-13 | reverts NotCreator", async () => {
      await expect(contract.connect(stranger).release(id))
        .to.be.revertedWithCustomError(contract, "NotCreator");
    });

    it("TC-14 | reverts AlreadyReleased on double-call", async () => {
      await contract.connect(creator).release(id);
      await expect(contract.connect(creator).release(id))
        .to.be.revertedWithCustomError(contract, "AlreadyReleased");
    });

    it("TC-15 | reverts GoalNotMet", async () => {
      const id2 = await makeVault({ goal: ethers.parseEther("10") });
      await contract.connect(pledger1).pledge(id2, { value: ethers.parseEther("0.1") });
      await time.increase(DAYS * 86400 + 1);
      await expect(contract.connect(creator).release(id2))
        .to.be.revertedWithCustomError(contract, "GoalNotMet");
    });
  });

  // ── refund ────────────────────────────────────────────────────────────────────
  describe("refund()", () => {
    const PARTIAL = ethers.parseEther("0.3");
    let id;
    beforeEach(async () => {
      id = await makeVault();
      await contract.connect(pledger1).pledge(id, { value: PARTIAL });
      await time.increase(DAYS * 86400 + 1);
    });

    it("TC-16 | returns ETH to pledger", async () => {
      const before = await ethers.provider.getBalance(pledger1.address);
      const tx     = await contract.connect(pledger1).refund(id);
      const rcpt   = await tx.wait();
      const gas    = rcpt.gasUsed * rcpt.gasPrice;
      expect(await ethers.provider.getBalance(pledger1.address)).to.equal(before + PARTIAL - gas);
      expect(await contract.getPledge(id, pledger1.address)).to.equal(0n);
    });

    it("TC-17 | reverts NoPledgeFound for non-pledger", async () => {
      await expect(contract.connect(stranger).refund(id))
        .to.be.revertedWithCustomError(contract, "NoPledgeFound");
    });

    it("TC-18 | reverts NoPledgeFound on double refund (replay protection)", async () => {
      await contract.connect(pledger1).refund(id);
      await expect(contract.connect(pledger1).refund(id))
        .to.be.revertedWithCustomError(contract, "NoPledgeFound");
    });

    it("TC-19 | reverts GoalAlreadyMet when goal was hit", async () => {
      const id2 = await makeVault();
      await contract.connect(pledger1).pledge(id2, { value: GOAL });
      await time.increase(DAYS * 86400 + 1);
      await expect(contract.connect(pledger1).refund(id2))
        .to.be.revertedWithCustomError(contract, "GoalAlreadyMet");
    });
  });

  // ── getAllVaults ──────────────────────────────────────────────────────────────
  describe("getAllVaults()", () => {
    it("TC-20 | returns vaults in order, empty when none", async () => {
      expect((await contract.getAllVaults()).length).to.equal(0);
      await makeVault({ title: "Alpha" });
      await makeVault({ title: "Beta" });
      const all = await contract.getAllVaults();
      expect(all.length).to.equal(2);
      expect(all[0].title).to.equal("Alpha");
      expect(all[1].title).to.equal("Beta");
    });
  });
});
