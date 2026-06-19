document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const track = carousel.querySelector("[data-carousel-track]");
  const slides = Array.from(track.children);
  const dots = carousel.querySelector("[data-carousel-dots]");
  const prev = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  let index = 0;

  const dotButtons = slides.map((_, slideIndex) => {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to slide ${slideIndex + 1}`);
    dot.addEventListener("click", () => {
      index = slideIndex;
      update();
    });
    dots.append(dot);
    return dot;
  });

  const update = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dotButtons.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  };

  prev.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    update();
  });

  next.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    update();
  });

  update();
});

// Sync videos shown together: time-scale each clip via playbackRate so every
// video in a group finishes in the same wall-clock time, then start them
// together. With equal periods, the native loop keeps them aligned — no
// per-frame seeking (which caused stutter).
function syncVideoGroup(videos) {
  if (videos.length < 2) return;

  videos.forEach((v) => {
    v.loop = true;
    v.pause();
  });

  let started = false;
  const tryStart = () => {
    if (started) return;
    if (!videos.every((v) => v.readyState >= 3 && v.duration)) return;
    started = true;
    const target = Math.max(...videos.map((v) => v.duration));
    videos.forEach((v) => {
      v.playbackRate = v.duration / target;
      v.currentTime = 0;
    });
    videos.forEach((v) => v.play().catch(() => {}));
  };

  videos.forEach((v) => {
    if (v.readyState >= 3 && v.duration) {
      tryStart();
    } else {
      v.addEventListener("canplay", tryStart);
    }
  });
}

// A sync group is a split-layout, or a leaf scene-block (one with no nested
// scene-block — this excludes the carousel wrappers, whose slides each form
// their own group).
const syncGroups = [
  ...document.querySelectorAll(".split-layout"),
  ...Array.from(document.querySelectorAll(".scene-block")).filter(
    (block) => !block.querySelector(".scene-block")
  ),
];

syncGroups.forEach((group) => {
  syncVideoGroup(Array.from(group.querySelectorAll("video")));
});

document.querySelectorAll("[data-baseline-group]").forEach((group) => {
  const video = group.querySelector("[data-baseline-video]");
  const tabs = Array.from(group.querySelectorAll(".baseline-tab"));

  // A sibling video in the same group to re-sync against after switching.
  const slide = group.closest(".scene-block");
  const sibling = slide
    ? Array.from(slide.querySelectorAll("video")).find((v) => v !== video)
    : null;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((button) => button.classList.remove("is-active"));
      tab.classList.add("is-active");
      video.src = tab.dataset.baselineSrc;
      video.load();
      video.addEventListener(
        "canplay",
        () => {
          if (sibling && sibling.duration && video.duration) {
            // Match the sibling's wall-clock period and phase.
            const period = sibling.duration / sibling.playbackRate;
            video.playbackRate = video.duration / period;
            video.currentTime =
              (sibling.currentTime / sibling.duration) * video.duration;
          }
          video.play().catch(() => {});
        },
        { once: true }
      );
    });
  });
});
