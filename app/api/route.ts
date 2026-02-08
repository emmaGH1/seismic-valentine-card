import { NextRequest, NextResponse } from "next/server";

/**
 * Discord Avatar Fetcher API Route
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://discord.com/developers/applications
 * 2. Create a new application (or use existing)
 * 3. Go to "Bot" section → create a bot
 * 4. Copy the bot token
 * 5. Add it to your .env.local as DISCORD_BOT_TOKEN=your_token_here
 * 6. The bot needs to be in your Seismic Discord server
 * 7. Bot needs the "GUILD_MEMBERS" privileged intent enabled
 *
 * Optional: Set DISCORD_GUILD_ID in .env.local to search within your specific server
 *
 * HOW IT WORKS:
 * - Receives a Discord username query parameter
 * - Uses the Discord API to search for the user
 * - Returns their avatar URL
 *
 * FALLBACK: If the bot isn't configured, returns null so the frontend
 * falls back to generated avatars (DiceBear identicon)
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  // If bot token not configured, return null (frontend will use fallback)
  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json({
      avatarUrl: null,
      message: "Discord bot not configured. Using fallback avatar.",
    });
  }

  try {
    let avatarUrl: string | null = null;

    if (DISCORD_GUILD_ID) {
      // Search within a specific guild (server) — most reliable
      const searchRes = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=1`,
        {
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (searchRes.ok) {
        const members = await searchRes.json();
        if (members.length > 0) {
          const member = members[0];
          const user = member.user;
          if (user.avatar) {
            const ext = user.avatar.startsWith("a_") ? "gif" : "png";
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
          } else {
            // Default Discord avatar
            const index = (BigInt(user.id) >> BigInt(22)) % BigInt(6);
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
          }
        }
      }
    } else {
      // Without guild ID, try searching via the user lookup endpoint
      // Note: This requires knowing the user's ID, so guild search is preferred
      // As a fallback, return null
      avatarUrl = null;
    }

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Discord API error:", error);
    return NextResponse.json({ avatarUrl: null });
  }
}