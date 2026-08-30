type SavedElementScrollState = {
  element: HTMLElement;
  overflow: string;
  overscrollBehavior: string;
  touchAction: string;
  scrollLeft: number;
  scrollTop: number;
};

type SavedPageScrollState = {
  bodyHadModalClass: boolean;
  body: {
    left: string;
    overflow: string;
    overscrollBehavior: string;
    position: string;
    top: string;
    touchAction: string;
    width: string;
  };
  documentElement: {
    overflow: string;
    overscrollBehavior: string;
  };
  elements: SavedElementScrollState[];
  windowScrollLeft: number;
  windowScrollTop: number;
};

const workspacePageScrollSelectors = [
  ".app-work-canvas > .app-content",
  ".manage-shell-v2 .manage-page",
  "[data-workspace-page-scroll]",
].join(",");

let lockCount = 0;
let savedState: SavedPageScrollState | null = null;

function preventBackgroundModalScroll(event: Event) {
  const target = event.target;
  if (target instanceof Element && target.closest('[aria-modal="true"]')) return;
  event.preventDefault();
}

function restoreLockedWorkspacePosition(event: Event) {
  if (!savedState || !(event.target instanceof HTMLElement)) return;
  const savedElement = savedState.elements.find(
    ({ element }) => element === event.target,
  );
  if (!savedElement) return;
  if (savedElement.element.scrollLeft !== savedElement.scrollLeft) {
    savedElement.element.scrollLeft = savedElement.scrollLeft;
  }
  if (savedElement.element.scrollTop !== savedElement.scrollTop) {
    savedElement.element.scrollTop = savedElement.scrollTop;
  }
}

/**
 * Locks both the browser document and Costivra's nested App/Manage page scrollports.
 * Calls are reference-counted so a confirmation dialog can safely open over a sheet.
 */
export function lockWorkspaceModalScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => undefined;
  }

  if (lockCount === 0) {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(workspacePageScrollSelectors),
    ).map((element) => ({
      element,
      overflow: element.style.overflow,
      overscrollBehavior: element.style.overscrollBehavior,
      touchAction: element.style.touchAction,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    }));

    savedState = {
      bodyHadModalClass: document.body.classList.contains("modal-open"),
      body: {
        left: document.body.style.left,
        overflow: document.body.style.overflow,
        overscrollBehavior: document.body.style.overscrollBehavior,
        position: document.body.style.position,
        top: document.body.style.top,
        touchAction: document.body.style.touchAction,
        width: document.body.style.width,
      },
      documentElement: {
        overflow: document.documentElement.style.overflow,
        overscrollBehavior: document.documentElement.style.overscrollBehavior,
      },
      elements,
      windowScrollLeft: window.scrollX,
      windowScrollTop: window.scrollY,
    };

    document.body.classList.add("modal-open");
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedState.windowScrollTop}px`;
    document.body.style.left = `-${savedState.windowScrollLeft}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";

    for (const { element } of elements) {
      element.style.overflow = "hidden";
      element.style.overscrollBehavior = "none";
      element.style.touchAction = "none";
    }

    document.addEventListener("wheel", preventBackgroundModalScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchmove", preventBackgroundModalScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("scroll", restoreLockedWorkspacePosition, {
      capture: true,
      passive: true,
    });
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount !== 0 || !savedState) return;

    const state = savedState;
    savedState = null;

    document.removeEventListener("wheel", preventBackgroundModalScroll, true);
    document.removeEventListener("touchmove", preventBackgroundModalScroll, true);
    document.removeEventListener("scroll", restoreLockedWorkspacePosition, true);

    for (const savedElement of state.elements) {
      savedElement.element.style.overflow = savedElement.overflow;
      savedElement.element.style.overscrollBehavior = savedElement.overscrollBehavior;
      savedElement.element.style.touchAction = savedElement.touchAction;
      savedElement.element.scrollLeft = savedElement.scrollLeft;
      savedElement.element.scrollTop = savedElement.scrollTop;
    }

    document.documentElement.style.overflow = state.documentElement.overflow;
    document.documentElement.style.overscrollBehavior =
      state.documentElement.overscrollBehavior;
    document.body.style.position = state.body.position;
    document.body.style.top = state.body.top;
    document.body.style.left = state.body.left;
    document.body.style.width = state.body.width;
    document.body.style.overflow = state.body.overflow;
    document.body.style.overscrollBehavior = state.body.overscrollBehavior;
    document.body.style.touchAction = state.body.touchAction;
    if (!state.bodyHadModalClass) document.body.classList.remove("modal-open");
    window.scrollTo({
      left: state.windowScrollLeft,
      top: state.windowScrollTop,
      behavior: "auto",
    });
  };
}
