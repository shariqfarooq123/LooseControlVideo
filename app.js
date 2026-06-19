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

// Play videos only while their group is on (or near) screen. Mobile devices
// have very few hardware video decoders, so autoplaying every clip at once is
// what makes the page lag — this keeps only the visible groups decoding.
//
// Within a group, each clip is time-scaled via playbackRate so they all finish
// in the same wall-clock time; with equal periods the native loop keeps them
// aligned without per-frame seeking.
function setupVideoGroup(groupEl) {
  const videos = Array.from(groupEl.querySelectorAll("video"));
  if (!videos.length) return;

  videos.forEach((v) => {
    v.loop = true;
    v.autoplay = false;
    v.muted = true; // required for programmatic inline playback on iOS
    v.pause();
  });

  let target = null;
  const computeRates = () => {
    if (target || !videos.every((v) => v.duration)) return;
    target = Math.max(...videos.map((v) => v.duration));
    videos.forEach((v) => {
      v.playbackRate = v.duration / target;
    });
  };
  videos.forEach((v) => {
    if (v.duration) computeRates();
    else v.addEventListener("loadedmetadata", computeRates, { once: true });
  });

  let inView = false;
  let aligned = false;

  const play = () => {
    computeRates();
    // Always call play() first — this is what kicks off buffering. With
    // preload="metadata", mobile browsers won't reach "canplay" until play()
    // is invoked, so we must not wait for it beforehand (that deadlocks and
    // leaves a black frame).
    videos.forEach((v) => v.play().catch(() => {}));
    if (aligned) return;

    // Once every clip can actually play, snap them to 0 together for a synced
    // start, then resume.
    let ready = 0;
    const onReady = () => {
      if (++ready < videos.length || !inView || aligned) return;
      aligned = true;
      videos.forEach((v) => { v.currentTime = 0; });
      videos.forEach((v) => v.play().catch(() => {}));
    };
    videos.forEach((v) => {
      if (v.readyState >= 3) onReady();
      else v.addEventListener("canplay", onReady, { once: true });
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (inView) play();
      else videos.forEach((v) => v.pause());
    },
    { rootMargin: "200px 0px", threshold: 0 }
  );
  observer.observe(groupEl);
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

syncGroups.forEach(setupVideoGroup);

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
