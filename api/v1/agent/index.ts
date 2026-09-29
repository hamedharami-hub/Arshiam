import { handleAgentRequest } from "../../_lib/agentApi.js";

export default async function handler(req: any, res: any) {
  return handleAgentRequest(req, res);
}
