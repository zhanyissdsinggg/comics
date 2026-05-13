import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminSeriesPageNew from "../AdminSeriesPageNew";
import {
  adminDelete,
  adminGet,
  adminPatch,
  adminPost,
} from "../../../lib/adminApiClient";

jest.mock("next/image", () => {
  return function MockImage(props) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  };
});

jest.mock("../../../lib/adminApiClient", () => ({
  adminDelete: jest.fn(),
  adminGet: jest.fn(),
  adminPatch: jest.fn(),
  adminPost: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

jest.mock("../AuthContext", () => ({
  useAdminAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockSeries = [
  {
    id: "series-1",
    title: "Alpha Comic",
    author: "",
    type: "comic",
    status: "Ongoing",
    adult: false,
    rating: 4.5,
    ratingCount: 100,
    description: "A polished fantasy comic.",
    coverUrl: "https://example.com/cover-1.jpg",
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-03-01").toISOString(),
    isPublished: false,
    isFeatured: false,
    genres: [],
    pricing: { currency: "POINTS", episodePrice: 5, discount: 0 },
    ttf: { enabled: true, intervalHours: 24 },
  },
  {
    id: "series-2",
    title: "Bravo Novel",
    author: "Studio Bravo",
    type: "novel",
    status: "Completed",
    adult: true,
    rating: 4.8,
    ratingCount: 200,
    description: "A premium novel.",
    coverUrl: "https://example.com/cover-2.jpg",
    createdAt: new Date("2024-02-01").toISOString(),
    updatedAt: new Date("2024-02-15").toISOString(),
    isPublished: true,
    isFeatured: false,
    genres: [],
    pricing: { currency: "POINTS", episodePrice: 5, discount: 0 },
    ttf: { enabled: true, intervalHours: 24 },
  },
];

describe("AdminSeriesPageNew", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminGet.mockResolvedValue({
      ok: true,
      data: { series: mockSeries },
    });
    adminPatch.mockResolvedValue({
      ok: true,
      data: { success: true },
    });
    adminDelete.mockResolvedValue({
      ok: true,
      data: { success: true },
    });
    adminPost.mockResolvedValue({
      ok: true,
      data: { success: true },
    });
  });

  it("loads the advanced search endpoint on first render", async () => {
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(adminGet).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/series/search/advanced"),
      );
    });
  });

  it("renders series returned from the API", async () => {
    render(<AdminSeriesPageNew />);

    expect(await screen.findByText("Alpha Comic")).toBeInTheDocument();
    expect(screen.getByText("Bravo Novel")).toBeInTheDocument();
  });

  it("includes the search query in follow-up requests", async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    const searchInput = await screen.findByRole("textbox");
    await user.type(searchInput, "Alpha");

    await waitFor(() => {
      const requestUrls = adminGet.mock.calls.map(([url]) => String(url));
      expect(requestUrls.some((url) => url.includes("search=Alpha"))).toBe(
        true,
      );
    });
  });

  it("shows the bulk toolbar after selecting one series", async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await screen.findByText("Alpha Comic");

    const [firstCheckbox] = screen.getAllByRole("checkbox");
    await user.click(firstCheckbox);

    expect(screen.getByText("已选择 1 项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
  });

  it("publishes the selected series from the bulk toolbar", async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await screen.findByText("Alpha Comic");

    const [firstCheckbox] = screen.getAllByRole("checkbox");
    await user.click(firstCheckbox);
    await user.click(screen.getByRole("button", { name: "发布" }));

    await waitFor(() => {
      expect(adminPatch).toHaveBeenCalledWith(
        "/api/admin/series/series-1",
        expect.objectContaining({
          series: expect.objectContaining({
            id: "series-1",
            isPublished: true,
          }),
        }),
      );
    });
  });

  it("includes author in the create payload", async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await screen.findByText("Alpha Comic");

    await user.click(screen.getByRole("button", { name: "新增作品" }));
    await user.type(
      screen.getByRole("textbox", { name: /作品标题/i }),
      "Creator Launch",
    );
    await user.type(
      screen.getByRole("textbox", { name: /作者 \/ 工作室/i }),
      "Studio LICO",
    );
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(adminPost).toHaveBeenCalledWith(
        "/api/admin/series",
        expect.objectContaining({
          series: expect.objectContaining({
            title: "Creator Launch",
            author: "Studio LICO",
          }),
        }),
      );
    });
  });
});
