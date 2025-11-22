import { request } from "undici";
import type { RequestInit } from "undici";

const defaultHeaders: Record<string, string> = {
  "User-Agent": "AstroBridge-Client/0.0.1",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  DNT: "1",
};

export const astroNetwork = {
  get: async (url: string, options: RequestInit = {}) => {
    const { headers: u_headers, ...rest } = options;
    const headers = u_headers ? u_headers : defaultHeaders;

    const res = await request(url, {
      method: "GET",
      headers,
      ...(rest as any),
    });

    return res;
  },

  post: async (url: string, body: unknown, options: RequestInit = {}) => {
    const { headers: u_headers, ...rest } = options;
    const headers = u_headers ? u_headers : defaultHeaders;

    const res = await request(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(headers ? headers : {}),
      },
      ...(rest as any),
    });

    return res;
  },
};
