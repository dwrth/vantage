# Section backgrounds

```ts
type SectionBackground = {
  color?: string; // any valid CSS color
  image?: string; // URL
  imageSize?: 'cover' | 'contain' | 'auto';
  imagePosition?: string; // CSS background-position (legacy when focal fields unset)
  imageRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  objectPositionX?: number; // 0–100 focal crop X
  objectPositionY?: number; // 0–100 focal crop Y
  cropScale?: number; // 0.4–1 zoom for focal crop
  blur?: number; // 0..200 px
  opacity?: number; // 0..1
  parallax?: boolean; // scroll parallax when image is set
};
```

Apply via `updateSection`:

```ts
updateSection(layout, sectionId, {
  background: {
    color: '#0f172a',
    image: 'https://picsum.photos/seed/hero/1600/900',
    imageSize: 'cover',
    blur: 24,
    opacity: 0.55,
  },
});
```

The background sits behind the grid (separate layer, so `blur` doesn't affect content). When `objectPositionX` / `objectPositionY` / `cropScale` are set, Vantage places the image with focal crop instead of CSS `background-position`. The demo's `SectionInspector` edits every field (including the cover focal-point cropper); it's pure host code, so you can build the same panel however you like.
