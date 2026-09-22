import { patchHistory } from "../content/page-bridge.js";

describe("page-bridge — patchHistory", () => {
  let postMessageSpy: jest.SpyInstance;
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;

  beforeEach(() => {
    originalPushState = history.pushState.bind(history);
    originalReplaceState = history.replaceState.bind(history);

    // Reset to originals before each test so patches don't stack
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    postMessageSpy = jest.spyOn(window, "postMessage").mockImplementation(() => {});

    patchHistory();
  });

  afterEach(() => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    postMessageSpy.mockRestore();
  });

  it("posts AUA_ROUTE_CHANGE with correct envelope after pushState", () => {
    history.pushState({}, "", "/new-path");

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "AUA_ROUTE_CHANGE", auaVersion: "1", url: "/new-path" },
      window.location.origin
    );
  });

  it("posts AUA_ROUTE_CHANGE with correct envelope after replaceState", () => {
    history.replaceState({}, "", "/replaced-path");

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "AUA_ROUTE_CHANGE", auaVersion: "1", url: "/replaced-path" },
      window.location.origin
    );
  });

  it("coerces null/undefined url to empty string", () => {
    history.pushState({}, "");

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "AUA_ROUTE_CHANGE", auaVersion: "1", url: "" },
      window.location.origin
    );
  });

  it("still calls the original pushState (does not swallow the navigation)", () => {
    const originalSpy = jest.fn();
    history.pushState = originalSpy;
    patchHistory();

    history.pushState({ key: "val" }, "", "/test");
    expect(originalSpy).toHaveBeenCalledWith({ key: "val" }, "", "/test");
  });
});
