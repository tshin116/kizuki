import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 はネイティブモジュールのためバンドルせずサーバーで直接読み込む
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
