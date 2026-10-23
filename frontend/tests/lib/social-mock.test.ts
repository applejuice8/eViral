import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  fbContacts,
  fbPosts,
  fbStories,
  igPosts,
  igStories,
  igSuggestions,
  ttVideos,
} from "@/lib/social-mock";

// vitest runs with the frontend package as cwd.
const publicDir = resolve(process.cwd(), "public");

function expectUniqueIds(items: { id: string }[], label: string) {
  const ids = items.map((i) => i.id);
  expect(new Set(ids).size, `${label} ids must be unique`).toBe(ids.length);
}

describe("social mock data integrity", () => {
  it("uses unique ids within every collection", () => {
    expectUniqueIds(igStories, "igStories");
    expectUniqueIds(igPosts, "igPosts");
    expectUniqueIds(igSuggestions, "igSuggestions");
    expectUniqueIds(fbStories, "fbStories");
    expectUniqueIds(fbPosts, "fbPosts");
    expectUniqueIds(ttVideos, "ttVideos");
    // fbContacts are SocialUser records with no id — unique handles instead.
    const handles = fbContacts.map((c) => c.handle);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it("gives every user a name, handle and initials", () => {
    const users = [
      ...igStories.map((s) => s.user),
      ...igPosts.map((p) => p.user),
      ...igSuggestions.map((s) => s.user),
      ...fbStories.map((s) => s.user),
      ...fbPosts.map((p) => p.user),
      ...fbContacts,
      ...ttVideos.map((v) => v.user),
    ];
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.name.trim().length).toBeGreaterThan(0);
      expect(user.handle.trim().length).toBeGreaterThan(0);
      expect(user.initials.trim().length).toBeGreaterThan(0);
    }
  });

  it("references only images that exist in public/assets", () => {
    const images = [
      ...igPosts.map((p) => p.image),
      ...fbPosts.flatMap((p) => (p.image ? [p.image] : [])),
      ...ttVideos.map((v) => v.image),
    ];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.startsWith("/assets/")).toBe(true);
      expect(existsSync(`${publicDir}${image}`)).toBe(true);
    }
  });

  it("gives every post an accessible text alternative", () => {
    for (const post of igPosts) {
      expect(post.alt.trim().length).toBeGreaterThan(0);
    }
    for (const video of ttVideos) {
      expect(video.imageAlt.trim().length).toBeGreaterThan(0);
    }
    for (const post of fbPosts) {
      if (post.image) {
        expect(post.imageAlt?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("formats TikTok hashtags with a leading #", () => {
    for (const video of ttVideos) {
      for (const tag of video.hashtags) {
        expect(tag.startsWith("#")).toBe(true);
      }
    }
  });
});
