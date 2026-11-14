import { describe, expect, it } from "vitest";

import {
  createAccountMaterial,
  createOrgKey,
  decryptField,
  deriveRecoveryKek,
  encryptField,
  encryptJson,
  grantOrgKey,
  openAccountMaterial,
  openOrgGrant,
  openOrgKey,
  openWithRecovery,
} from "@/lib/crypto";

describe("crypto key flows", () => {
  it("creates and unlocks account material with password and recovery", async () => {
    const material = await createAccountMaterial("correct horse battery staple");

    expect(material.salt).toBeTruthy();
    expect(material.wrapped).toBeTruthy();
    expect(material.pub).toBeTruthy();
    expect(material.mnemonic.split(/\s+/).length).toBe(24);

    const opened = await openAccountMaterial("correct horse battery staple", material);
    const cipher = await encryptField(opened.keys.dek, "hello");
    expect(await decryptField(opened.keys.dek, cipher)).toBe("hello");

    // Recovery: same package wrapped under PBKDF2(mnemonic, salt)
    const recoveryKek = await deriveRecoveryKek(material.mnemonic, material.salt);
    const recoveryWrapped = await encryptJson(recoveryKek, material.pkg);
    const recovered = await openWithRecovery(material.mnemonic, {
      salt: material.salt,
      wrapped: recoveryWrapped,
    });
    expect(await decryptField(recovered.keys.dek, cipher)).toBe("hello");
  });

  it("creates org key, wraps for owner, and grants to member via ECDH", async () => {
    const owner = await createAccountMaterial("owner-pass");
    const member = await createAccountMaterial("member-pass");

    const { key: orgKey, wrapped } = await createOrgKey(owner.keys.dek);
    const ownerOrg = await openOrgKey(owner.keys.dek, wrapped);

    const secret = await encryptField(orgKey, "team task");
    expect(await decryptField(ownerOrg, secret)).toBe("team task");

    const grant = await grantOrgKey(member.pub, orgKey);
    const memberOrg = await openOrgGrant(member.keys.priv, grant);
    expect(await decryptField(memberOrg, secret)).toBe("team task");
  });
});
