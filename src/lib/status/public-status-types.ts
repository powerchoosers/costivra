export type PublicServiceState = "operational" | "limited" | "outage";

export type PublicServiceStatus = {
  id: "website" | "workspace" | "intake" | "extraction";
  name: string;
  state: PublicServiceState;
  message: string;
};

export type PublicSystemStatus = {
  checkedAt: string;
  overall: PublicServiceState;
  headline: string;
  services: PublicServiceStatus[];
};
