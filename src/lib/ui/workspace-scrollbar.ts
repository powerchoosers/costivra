export type WorkspaceScrollbarAxis = "x" | "y";

export type WorkspaceScrollbarThumbMetrics = {
  offset: number;
  size: number;
  trackOffset: number;
  trackSize: number;
};

type VerticalScrollMetrics = Pick<HTMLElement, "clientHeight" | "scrollHeight" | "scrollTop">;

type WorkspaceScrollbarThumbInput = {
  viewportOffset: number;
  viewportSize: number;
  scrollSize: number;
  scrollOffset: number;
  inset?: number;
  startInset?: number;
  endInset?: number;
  minThumbSize?: number;
};

/**
 * Returns the next vertical position only when a wheel movement can actually
 * move this scrollport. Callers can then leave an edge-bound wheel event alone
 * so the browser can hand it to the surrounding scrollport.
 */
export function getNextVerticalScrollTop(
  element: VerticalScrollMetrics,
  deltaY: number,
): number | null {
  if (
    !Number.isFinite(element.clientHeight)
    || !Number.isFinite(element.scrollHeight)
    || !Number.isFinite(element.scrollTop)
    || !Number.isFinite(deltaY)
    || deltaY === 0
  ) {
    return null;
  }

  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
  if (maxScrollTop === 0) return null;

  const currentScrollTop = Math.min(maxScrollTop, Math.max(0, element.scrollTop));
  const nextScrollTop = Math.min(
    maxScrollTop,
    Math.max(0, currentScrollTop + deltaY),
  );

  return nextScrollTop === currentScrollTop ? null : nextScrollTop;
}

/**
 * The shared smooth-scroll layer marks its deliberate native scrollports.
 * When a wheel starts inside one, an outer page should not steal it while the
 * nested region still owns the interaction.
 */
export function hasNestedNativeScrollRegion(
  target: EventTarget | null,
  owner: HTMLElement,
) {
  if (!(target instanceof Element)) return false;

  const region = target.closest("[data-workspace-scrollbar], [data-lenis-prevent]");
  return region !== null && region !== owner && owner.contains(region);
}

/**
 * Calculates a scrollbar thumb without depending on a browser-painted native
 * scrollbar. The same geometry works for the page frame, rails, and nested
 * scrollports, while the browser retains responsibility for actual scrolling.
 */
export function getWorkspaceScrollbarThumbMetrics({
  viewportOffset,
  viewportSize,
  scrollSize,
  scrollOffset,
  inset = 4,
  startInset = inset,
  endInset = inset,
  minThumbSize = 28,
}: WorkspaceScrollbarThumbInput): WorkspaceScrollbarThumbMetrics | null {
  const maxScroll = scrollSize - viewportSize;
  const trackOffset = viewportOffset + startInset;
  const trackSize = Math.max(0, viewportSize - startInset - endInset);

  if (
    !Number.isFinite(viewportOffset)
    || !Number.isFinite(viewportSize)
    || !Number.isFinite(scrollSize)
    || !Number.isFinite(scrollOffset)
    || viewportSize <= 0
    || scrollSize <= viewportSize
    || trackSize <= 0
  ) {
    return null;
  }

  const size = Math.min(
    trackSize,
    Math.max(minThumbSize, trackSize * (viewportSize / scrollSize)),
  );
  const travel = Math.max(0, trackSize - size);
  const progress = Math.min(1, Math.max(0, scrollOffset / maxScroll));

  return {
    offset: trackOffset + travel * progress,
    size,
    trackOffset,
    trackSize,
  };
}

type ActiveScrollbar = {
  target: HTMLElement;
  visible: boolean;
};

type AxisLayout = {
  height: number;
  left: number;
  maxScroll: number;
  scrollOffset: number;
  top: number;
  trackSize: number;
  width: number;
};

type DragState = {
  axis: WorkspaceScrollbarAxis;
  maxScroll: number;
  pointerStart: number;
  scrollStart: number;
  target: HTMLElement;
  trackTravel: number;
};

type WorkspaceScrollbarOverlay = {
  destroy: () => void;
  refresh: () => void;
  setActive: (target: HTMLElement, axis: WorkspaceScrollbarAxis, active: boolean) => void;
};

const OVERLAY_INSET = 4;
const OVERLAY_THICKNESS = 6;

function isViewportScrollport(target: HTMLElement) {
  return target === document.documentElement
    || target === document.body
    || target === document.scrollingElement;
}

function getScrollElement(target: HTMLElement) {
  return isViewportScrollport(target)
    ? (document.scrollingElement as HTMLElement | null) ?? document.documentElement
    : target;
}

function getScrollOffset(target: HTMLElement, axis: WorkspaceScrollbarAxis) {
  if (isViewportScrollport(target)) return axis === "x" ? window.scrollX : window.scrollY;
  return axis === "x" ? target.scrollLeft : target.scrollTop;
}

function setScrollOffset(target: HTMLElement, axis: WorkspaceScrollbarAxis, offset: number) {
  if (isViewportScrollport(target)) {
    window.scrollTo({
      left: axis === "x" ? offset : window.scrollX,
      top: axis === "y" ? offset : window.scrollY,
      behavior: "auto",
    });
    return;
  }

  if (axis === "x") target.scrollLeft = offset;
  else target.scrollTop = offset;
}

function getViewportStartInset(axis: WorkspaceScrollbarAxis) {
  if (axis !== "y" || !window.matchMedia("(max-width: 760px)").matches) return OVERLAY_INSET;

  const header = document.querySelector<HTMLElement>(".marketing-header");
  if (!header || window.getComputedStyle(header).position !== "fixed") return OVERLAY_INSET;

  const rect = header.getBoundingClientRect();
  if (rect.top > 0 || rect.bottom <= 0) return OVERLAY_INSET;

  return Math.max(
    OVERLAY_INSET,
    Math.min(window.innerHeight - OVERLAY_INSET, rect.bottom + OVERLAY_INSET),
  );
}

function getAxisLayout(target: HTMLElement, axis: WorkspaceScrollbarAxis): AxisLayout | null {
  const scrollElement = getScrollElement(target);
  const isViewport = isViewportScrollport(target);
  const rect = isViewport
    ? { left: 0, top: 0 }
    : target.getBoundingClientRect();
  const viewportSize = isViewport
    ? axis === "x" ? window.innerWidth : window.innerHeight
    : axis === "x" ? scrollElement.clientWidth : scrollElement.clientHeight;
  const scrollSize = axis === "x" ? scrollElement.scrollWidth : scrollElement.scrollHeight;
  const viewportOffset = isViewport
    ? 0
    : axis === "x" ? rect.left + scrollElement.clientLeft : rect.top + scrollElement.clientTop;
  const metrics = getWorkspaceScrollbarThumbMetrics({
    viewportOffset,
    viewportSize,
    scrollSize,
    scrollOffset: getScrollOffset(target, axis),
    inset: OVERLAY_INSET,
    startInset: isViewport ? getViewportStartInset(axis) : OVERLAY_INSET,
  });

  if (!metrics) return null;

  const contentLeft = isViewport ? 0 : rect.left + scrollElement.clientLeft;
  const contentTop = isViewport ? 0 : rect.top + scrollElement.clientTop;
  const contentWidth = isViewport ? window.innerWidth : scrollElement.clientWidth;
  const contentHeight = isViewport ? window.innerHeight : scrollElement.clientHeight;
  const contentRight = contentLeft + contentWidth;
  const contentBottom = contentTop + contentHeight;

  if (contentRight <= 0 || contentBottom <= 0 || contentLeft >= window.innerWidth || contentTop >= window.innerHeight) {
    return null;
  }

  const maxScroll = Math.max(0, scrollSize - viewportSize);

  return axis === "x"
    ? {
      left: metrics.offset,
      top: contentBottom - OVERLAY_INSET - OVERLAY_THICKNESS,
      width: metrics.size,
      height: OVERLAY_THICKNESS,
      trackSize: metrics.trackSize,
      maxScroll,
      scrollOffset: getScrollOffset(target, axis),
    }
    : {
      left: contentRight - OVERLAY_INSET - OVERLAY_THICKNESS,
      top: metrics.offset,
      width: OVERLAY_THICKNESS,
      height: metrics.size,
      trackSize: metrics.trackSize,
      maxScroll,
      scrollOffset: getScrollOffset(target, axis),
    };
}

/**
 * A single lightweight visual layer for browser-native scrolling. Native
 * scrollbar thumbs cannot reliably animate in Chromium, so this layer only
 * paints their affordance; wheel, keyboard, touch, and scroll physics remain
 * fully native.
 */
export function createWorkspaceScrollbarOverlay(): WorkspaceScrollbarOverlay {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const forcedColors = window.matchMedia("(forced-colors: active)");
  const canPaint = () => finePointer.matches && !forcedColors.matches;
  const noop: WorkspaceScrollbarOverlay = {
    destroy: () => undefined,
    refresh: () => undefined,
    setActive: () => undefined,
  };

  if (!canPaint()) return noop;

  const layer = document.createElement("div");
  layer.className = "workspace-scrollbar-layer";
  layer.setAttribute("aria-hidden", "true");

  const thumbs = {
    x: document.createElement("div"),
    y: document.createElement("div"),
  };

  (Object.keys(thumbs) as WorkspaceScrollbarAxis[]).forEach((axis) => {
    const thumb = thumbs[axis];
    thumb.className = `workspace-scrollbar-thumb workspace-scrollbar-thumb--${axis}`;
    thumb.dataset.workspaceScrollbarAxis = axis;
    layer.appendChild(thumb);
  });

  document.body.appendChild(layer);

  const active: Record<WorkspaceScrollbarAxis, ActiveScrollbar | null> = { x: null, y: null };
  const observed = new Set<HTMLElement>();
  const revealFrames: Record<WorkspaceScrollbarAxis, number | undefined> = { x: undefined, y: undefined };
  let animationFrame: number | undefined;
  let drag: DragState | null = null;

  const resizeObserver = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => scheduleRender());

  const syncObservedTargets = () => {
    const next = new Set(
      (Object.values(active).filter((entry): entry is ActiveScrollbar => entry !== null))
        .map((entry) => entry.target),
    );

    observed.forEach((target) => {
      if (!next.has(target)) {
        resizeObserver?.unobserve(target);
        observed.delete(target);
      }
    });

    next.forEach((target) => {
      if (!observed.has(target)) {
        resizeObserver?.observe(target);
        observed.add(target);
      }
    });
  };

  const renderAxis = (axis: WorkspaceScrollbarAxis) => {
    const thumb = thumbs[axis];
    const entry = active[axis];

    if (!canPaint() || !entry || !entry.target.isConnected) {
      thumb.classList.remove("is-visible");
      return;
    }

    const layout = getAxisLayout(entry.target, axis);
    if (!layout) {
      thumb.classList.remove("is-visible");
      return;
    }

    thumb.style.width = `${layout.width}px`;
    thumb.style.height = `${layout.height}px`;
    thumb.style.transform = `translate3d(${layout.left}px, ${layout.top}px, 0)`;
    thumb.classList.toggle("is-visible", entry.visible);
  };

  const render = () => {
    animationFrame = undefined;
    renderAxis("x");
    renderAxis("y");
  };

  function scheduleRender() {
    if (animationFrame !== undefined) return;
    animationFrame = window.requestAnimationFrame(render);
  }

  const cancelReveal = (axis: WorkspaceScrollbarAxis) => {
    const frame = revealFrames[axis];
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    revealFrames[axis] = undefined;
  };

  const revealAfterFirstPaint = (axis: WorkspaceScrollbarAxis, target: HTMLElement) => {
    // Chromium can batch a geometry update and an opacity change into one
    // paint. Separate them so a newly active thumb always fades in.
    cancelReveal(axis);
    revealFrames[axis] = window.requestAnimationFrame(() => {
      revealFrames[axis] = window.requestAnimationFrame(() => {
        revealFrames[axis] = undefined;
        const entry = active[axis];
        if (!entry || entry.target !== target) return;

        entry.visible = true;
        renderAxis(axis);
      });
    });
  };

  const setActive = (target: HTMLElement, axis: WorkspaceScrollbarAxis, visible: boolean) => {
    if (!canPaint()) return;

    if (visible) {
      const current = active[axis];
      const isNewTarget = !current || current.target !== target;
      active[axis] = isNewTarget ? { target, visible: false } : current;

      if (isNewTarget) revealAfterFirstPaint(axis, target);
    } else if (active[axis]?.target === target) {
      cancelReveal(axis);
      active[axis] = null;
      thumbs[axis].classList.remove("is-visible");
    }

    syncObservedTargets();
    scheduleRender();
  };

  const clear = () => {
    cancelReveal("x");
    cancelReveal("y");
    active.x = null;
    active.y = null;
    thumbs.x.classList.remove("is-visible");
    thumbs.y.classList.remove("is-visible");
    syncObservedTargets();
  };

  const handlePointerDown = (event: PointerEvent) => {
    const thumb = event.currentTarget as HTMLElement;
    const axis = thumb.dataset.workspaceScrollbarAxis as WorkspaceScrollbarAxis | undefined;
    if (!axis) return;

    const target = active[axis]?.target;
    if (!target) return;

    const layout = getAxisLayout(target, axis);
    if (!layout) return;

    const trackTravel = layout.trackSize - (axis === "x" ? layout.width : layout.height);
    if (trackTravel <= 0 || layout.maxScroll <= 0) return;

    event.preventDefault();
    drag = {
      axis,
      target,
      pointerStart: axis === "x" ? event.clientX : event.clientY,
      scrollStart: layout.scrollOffset,
      trackTravel,
      maxScroll: layout.maxScroll,
    };
    thumb.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const coordinate = drag.axis === "x" ? event.clientX : event.clientY;
    const delta = coordinate - drag.pointerStart;
    const offset = Math.min(
      drag.maxScroll,
      Math.max(0, drag.scrollStart + (delta * drag.maxScroll) / drag.trackTravel),
    );
    setScrollOffset(drag.target, drag.axis, offset);
    scheduleRender();
  };

  const handlePointerEnd = () => {
    drag = null;
  };

  (Object.values(thumbs) as HTMLElement[]).forEach((thumb) => {
    thumb.addEventListener("pointerdown", handlePointerDown);
    thumb.addEventListener("pointermove", handlePointerMove);
    thumb.addEventListener("pointerup", handlePointerEnd);
    thumb.addEventListener("pointercancel", handlePointerEnd);
    thumb.addEventListener("lostpointercapture", handlePointerEnd);
  });

  const handleCapabilityChange = () => {
    if (!canPaint()) clear();
    else scheduleRender();
  };

  finePointer.addEventListener("change", handleCapabilityChange);
  forcedColors.addEventListener("change", handleCapabilityChange);
  window.addEventListener("resize", scheduleRender, { passive: true });
  window.addEventListener("scroll", scheduleRender, { passive: true });

  return {
    setActive,
    refresh: scheduleRender,
    destroy: () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      cancelReveal("x");
      cancelReveal("y");
      resizeObserver?.disconnect();
      finePointer.removeEventListener("change", handleCapabilityChange);
      forcedColors.removeEventListener("change", handleCapabilityChange);
      window.removeEventListener("resize", scheduleRender);
      window.removeEventListener("scroll", scheduleRender);
      (Object.values(thumbs) as HTMLElement[]).forEach((thumb) => {
        thumb.removeEventListener("pointerdown", handlePointerDown);
        thumb.removeEventListener("pointermove", handlePointerMove);
        thumb.removeEventListener("pointerup", handlePointerEnd);
        thumb.removeEventListener("pointercancel", handlePointerEnd);
        thumb.removeEventListener("lostpointercapture", handlePointerEnd);
      });
      layer.remove();
    },
  };
}
