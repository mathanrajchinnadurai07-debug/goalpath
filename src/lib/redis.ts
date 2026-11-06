import net from "net";
import tls from "tls";

class RedisClient {
  private host: string;
  private port: number;
  private username?: string;
  private password?: string;
  private useTls: boolean;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      const parsed = new URL(redisUrl);
      this.useTls = parsed.protocol === "rediss:";
      this.host = parsed.hostname || "127.0.0.1";
      this.port = parsed.port ? parseInt(parsed.port, 10) : 6379;
      if (parsed.username) this.username = decodeURIComponent(parsed.username);
      if (parsed.password) this.password = decodeURIComponent(parsed.password);
    } else {
      this.useTls = process.env.REDIS_TLS === "true";
      this.host = process.env.REDIS_HOST || "127.0.0.1";
      this.port = parseInt(process.env.REDIS_PORT || "6379", 10);
      this.password = process.env.REDIS_PASSWORD;
    }
  }

  private encodeCommand(args: string[]): string {
    let cmd = `*${args.length}\r\n`;
    for (const arg of args) {
      const str = String(arg);
      cmd += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
    }
    return cmd;
  }

  private parseSingleResp(raw: string): string | number | null {
    if (raw.startsWith("+")) {
      return raw.slice(1, raw.indexOf("\r\n"));
    } else if (raw.startsWith(":")) {
      return parseInt(raw.slice(1, raw.indexOf("\r\n")), 10);
    } else if (raw.startsWith("$-1")) {
      return null;
    } else if (raw.startsWith("$")) {
      const firstNl = raw.indexOf("\r\n");
      const byteLen = parseInt(raw.slice(1, firstNl), 10);
      const buf = Buffer.from(raw.slice(firstNl + 2), "utf-8");
      return buf.subarray(0, byteLen).toString("utf-8");
    } else if (raw.startsWith("-")) {
      throw new Error(raw.slice(1, raw.indexOf("\r\n")));
    }
    return raw.trim();
  }

  private sendCommand(command: string[]): Promise<string | number | null> {
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        if (this.password) {
          const authArgs = this.username ? ["AUTH", this.username, this.password] : ["AUTH", this.password];
          socket.write(this.encodeCommand(authArgs) + this.encodeCommand(command));
        } else {
          socket.write(this.encodeCommand(command));
        }
      };

      const socket = this.useTls
        ? tls.connect({ host: this.host, port: this.port, servername: this.host }, onConnect)
        : net.createConnection({ host: this.host, port: this.port }, onConnect);

      let responseData = "";
      let responsesNeeded = this.password ? 2 : 1;

      socket.on("data", (data) => {
        responseData += data.toString("utf-8");
        const lines = responseData.split("\r\n");
        if (lines.length >= responsesNeeded + 1) {
          socket.end();
        }
      });

      socket.on("end", () => {
        try {
          if (this.password && responseData.startsWith("+OK\r\n")) {
            responseData = responseData.slice(5);
          }
          resolve(this.parseSingleResp(responseData));
        } catch (err) {
          reject(err);
        }
      });

      socket.on("error", (err) => {
        reject(err);
      });
    });
  }

  async get(key: string): Promise<string | null> {
    const res = await this.sendCommand(["GET", key]);
    return typeof res === "string" ? res : null;
  }

  async set(key: string, value: string, exOption?: "EX", ttlSeconds?: number): Promise<boolean> {
    const cmd = ["SET", key, value];
    if (exOption && ttlSeconds) {
      cmd.push("EX", String(ttlSeconds));
    }
    const res = await this.sendCommand(cmd);
    return res === "OK";
  }

  async del(key: string): Promise<boolean> {
    const res = await this.sendCommand(["DEL", key]);
    return res === 1;
  }

  async incr(key: string): Promise<number> {
    const res = await this.sendCommand(["INCR", key]);
    return typeof res === "number" ? res : 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const res = await this.sendCommand(["EXPIRE", key, String(seconds)]);
    return res === 1;
  }

  async ttl(key: string): Promise<number> {
    const res = await this.sendCommand(["TTL", key]);
    return typeof res === "number" ? res : -2;
  }

  async flushall(): Promise<boolean> {
    const res = await this.sendCommand(["FLUSHALL"]);
    return res === "OK";
  }
}

export const redis = new RedisClient(process.env.REDIS_URL);

export default redis;
