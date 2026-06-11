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

document.querySelectorAll("[data-baseline-group]").forEach((group) => {
  const video = group.querySelector("[data-baseline-video]");
  const tabs = Array.from(group.querySelectorAll(".baseline-tab"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((button) => button.classList.remove("is-active"));
      tab.classList.add("is-active");
      video.src = tab.dataset.baselineSrc;
      video.load();
      video.play().catch(() => {});
    });
  });
});
