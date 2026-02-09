import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Discord Avatar Fetcher — searches Seismic guild members by username
 *
 * Uses Discord REST API: GET /guilds/{id}/members/search?query={username}
 * Bot must be in the guild. No special permissions needed (permissions=0).
 *
 * Env vars required:
 *   DISCORD_BOT_TOKEN - bot token (from mod)
 *   DISCORD_GUILD_ID  - Seismic server ID
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return NextResponse.json({
      avatarUrl: null,
      displayName: null,
      message: "Discord bot not configured.",
    });
  }

  try {
    // Search guild members by username (matches username and nickname)
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      console.error("Discord API error:", res.status, await res.text());
      return NextResponse.json({ avatarUrl: null, displayName: null });
    }

    const members = await res.json();

    if (!members || members.length === 0) {
      return NextResponse.json({ avatarUrl: null, displayName: null });
    }

    // Find exact match first, fallback to first result
    const exact = members.find(
      (m: any) =>
        m.user.username.toLowerCase() === username.toLowerCase() ||
        (m.nick && m.nick.toLowerCase() === username.toLowerCase()) ||
        (m.user.global_name && m.user.global_name.toLowerCase() === username.toLowerCase())
    );
    const member = exact || members[0];
    const user = member.user;

    // Build avatar URL
    let avatarUrl: string | null = null;

    // Try guild-specific avatar first
    if (member.avatar) {
      const ext = member.avatar.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/guilds/${DISCORD_GUILD_ID}/users/${user.id}/avatars/${member.avatar}.${ext}?size=256`;
    }
    // Fallback to global avatar
    else if (user.avatar) {
      const ext = user.avatar.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    }
    // Default Discord avatar
    else {
      const index = (parseInt(user.id) >> 22) % 6;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    return NextResponse.json({
      avatarUrl,
      displayName: member.nick || user.global_name || user.username,
      username: user.username,
    });
  } catch (error) {
    console.error("Discord API error:", error);
    return NextResponse.json({ avatarUrl: null, displayName: null });
  }
}