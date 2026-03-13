import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkActionsToolbar from "../BulkActionsToolbar";

function createDeferred() {
  let resolve;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe("BulkActionsToolbar", () => {
  const createCallbacks = () => ({
    onPublish: jest.fn().mockResolvedValue(undefined),
    onUnpublish: jest.fn().mockResolvedValue(undefined),
    onDelete: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no rows are selected", () => {
    const callbacks = createCallbacks();
    const { container } = render(<BulkActionsToolbar selectedCount={0} {...callbacks} />);

    expect(container.firstChild).toBeNull();
  });

  it("shows the selected count and actions", () => {
    const callbacks = createCallbacks();
    render(<BulkActionsToolbar selectedCount={5} {...callbacks} />);

    expect(screen.getByText("已选择 5 项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消发布" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清空" })).toBeInTheDocument();
  });

  it("calls publish when the publish button is clicked", async () => {
    const callbacks = createCallbacks();
    const user = userEvent.setup();
    render(<BulkActionsToolbar selectedCount={3} {...callbacks} />);

    await user.click(screen.getByRole("button", { name: "发布" }));

    expect(callbacks.onPublish).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when clear is clicked", async () => {
    const callbacks = createCallbacks();
    const user = userEvent.setup();
    render(<BulkActionsToolbar selectedCount={3} {...callbacks} />);

    await user.click(screen.getByRole("button", { name: "清空" }));

    expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows progress and disables actions while an operation is running", async () => {
    const deferred = createDeferred();
    const callbacks = createCallbacks();
    callbacks.onPublish = jest.fn(() => deferred.promise);

    const user = userEvent.setup();
    render(<BulkActionsToolbar selectedCount={2} {...callbacks} />);

    const publishButton = screen.getByRole("button", { name: "发布" });
    const clearButton = screen.getByRole("button", { name: "清空" });

    await user.click(publishButton);

    expect(callbacks.onPublish).toHaveBeenCalledTimes(1);
    expect(publishButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
    expect(screen.getByText("发布中...")).toBeInTheDocument();

    deferred.resolve();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
    });
  });

  it("removes the latest undo entry when undo is clicked", async () => {
    const callbacks = createCallbacks();
    const user = userEvent.setup();
    render(<BulkActionsToolbar selectedCount={1} {...callbacks} />);

    await user.click(screen.getByRole("button", { name: "发布" }));

    const undoButton = await screen.findByRole("button", { name: "撤销" });
    await user.click(undoButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "撤销" })).not.toBeInTheDocument();
    });
  });
});
