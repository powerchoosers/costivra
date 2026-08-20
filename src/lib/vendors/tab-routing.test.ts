import { describe, expect, it } from "vitest";
import {
  getVendorDetailTabHref,
  resolveVendorDetailTab,
} from "@/lib/vendors/tab-routing";

describe("vendor detail tab routing", () => {
  it("keeps supported tabs and maps legacy deep links to the current workflow", () => {
    expect(resolveVendorDetailTab("accounts")).toBe("accounts");
    expect(resolveVendorDetailTab("files")).toBe("bills");
    expect(resolveVendorDetailTab("actions")).toBe("findings");
    expect(resolveVendorDetailTab("unrecognized")).toBe("overview");
  });

  it("keeps selected account context only while the accounts workflow is open", () => {
    expect(getVendorDetailTabHref("vendor-1", "accounts", "tab=accounts&account=account-1"))
      .toBe("/app/vendors/vendor-1?tab=accounts&account=account-1");
    expect(getVendorDetailTabHref("vendor-1", "bills", "tab=accounts&account=account-1"))
      .toBe("/app/vendors/vendor-1?tab=bills");
  });

  it("uses the clean base URL for the overview while retaining unrelated query context", () => {
    expect(getVendorDetailTabHref("vendor-1", "overview", "tab=findings&account=account-1&source=alert"))
      .toBe("/app/vendors/vendor-1?source=alert");
  });
});
