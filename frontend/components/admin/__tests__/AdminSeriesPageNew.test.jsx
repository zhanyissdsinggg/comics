import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminSeriesPageNew from '../AdminSeriesPageNew';
import * as apiClient from '../../../lib/apiClient';

/**
 * 老王说：AdminSeriesPageNew的单元测试
 * 这个测试覆盖了快速编辑、高级搜索、批量操作等核心功能
 */

jest.mock('../../../lib/apiClient');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));
jest.mock('../AuthContext', () => ({
  useAdminAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockSeries = [
  {
    id: 'series-1',
    title: '我的第一部漫画',
    type: 'comic',
    status: 'Ongoing',
    adult: false,
    rating: 4.5,
    ratingCount: 100,
    description: '这是一部很棒的漫画',
    coverUrl: 'https://example.com/cover1.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'series-2',
    title: '成人小说',
    type: 'novel',
    status: 'Completed',
    adult: true,
    rating: 4.8,
    ratingCount: 200,
    description: '这是一部成人小说',
    coverUrl: 'https://example.com/cover2.jpg',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
  },
];

describe('AdminSeriesPageNew - 快速编辑功能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.apiGet.mockResolvedValue({
      ok: true,
      data: { series: mockSeries },
    });
    apiClient.apiPatch.mockResolvedValue({
      ok: true,
      data: { success: true },
    });
  });

  it('应该渲染作品列表', async () => {
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
      expect(screen.getByText('成人小说')).toBeInTheDocument();
    });
  });

  it('应该支持快速编辑标题', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 点击标题进入编辑模式
    const titleElement = screen.getByText('我的第一部漫画');
    await user.click(titleElement);

    // 应该显示输入框
    const input = screen.getByDisplayValue('我的第一部漫画');
    expect(input).toBeInTheDocument();

    // 修改标题
    await user.clear(input);
    await user.type(input, '修改后的标题');

    // 点击保存按钮
    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    // 验证API调用
    await waitFor(() => {
      expect(apiClient.apiPatch).toHaveBeenCalledWith(
        '/api/admin/series/series-1',
        expect.objectContaining({
          series: expect.objectContaining({
            title: '修改后的标题',
          }),
        })
      );
    });
  });

  it('应该支持快速编辑状态', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('连载中')).toBeInTheDocument();
    });

    // 点击状态标签进入编辑模式
    const statusElement = screen.getByText('连载中');
    await user.click(statusElement);

    // 应该显示状态选择框
    const statusSelect = screen.getByDisplayValue('Ongoing');
    expect(statusSelect).toBeInTheDocument();

    // 修改状态
    await user.selectOption(statusSelect, 'Completed');

    // 点击保存按钮
    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    // 验证API调用
    await waitFor(() => {
      expect(apiClient.apiPatch).toHaveBeenCalledWith(
        '/api/admin/series/series-1',
        expect.objectContaining({
          series: expect.objectContaining({
            status: 'Completed',
          }),
        })
      );
    });
  });

  it('应该支持取消编辑', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 点击标题进入编辑模式
    const titleElement = screen.getByText('我的第一部漫画');
    await user.click(titleElement);

    // 修改标题
    const input = screen.getByDisplayValue('我的第一部漫画');
    await user.clear(input);
    await user.type(input, '修改后的标题');

    // 点击取消按钮
    const cancelButton = screen.getByText('取消');
    await user.click(cancelButton);

    // 应该恢复原始标题
    expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('修改后的标题')).not.toBeInTheDocument();
  });

  it('应该支持批量选择', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 获取所有复选框
    const checkboxes = screen.getAllByRole('checkbox');

    // 点击第一个复选框
    await user.click(checkboxes[0]);

    // 应该显示批量操作工具栏
    expect(screen.getByText('已选中 1 项')).toBeInTheDocument();
  });

  it('应该支持全选', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 点击全选按钮
    const selectAllButton = screen.getByText('全选');
    await user.click(selectAllButton);

    // 应该显示已选中2项
    expect(screen.getByText('已选中 2 项')).toBeInTheDocument();
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 输入搜索关键词
    const searchInput = screen.getByPlaceholderText('搜索作品标题或ID...');
    await user.type(searchInput, '漫画');

    // 应该只显示包含"漫画"的作品
    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
      expect(screen.queryByText('成人小说')).not.toBeInTheDocument();
    });
  });

  it('应该支持类型过滤', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 点击"小说"标签
    const novelTab = screen.getByText('小说');
    await user.click(novelTab);

    // 应该只显示小说类型的作品
    await waitFor(() => {
      expect(screen.queryByText('我的第一部漫画')).not.toBeInTheDocument();
      expect(screen.getByText('成人小说')).toBeInTheDocument();
    });
  });

  it('应该支持视图切换', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 获取列表视图按钮
    const listViewButton = screen.getByTitle('列表视图');
    await user.click(listViewButton);

    // 应该切换到列表视图
    expect(listViewButton).toHaveClass('bg-ios-blue');
  });
});

describe('AdminSeriesPageNew - 高级搜索集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.apiGet.mockResolvedValue({
      ok: true,
      data: { series: mockSeries },
    });
  });

  it('应该调用高级搜索API', async () => {
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(apiClient.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/series/search/advanced')
      );
    });
  });

  it('应该传递正确的查询参数', async () => {
    const user = userEvent.setup();
    render(<AdminSeriesPageNew />);

    await waitFor(() => {
      expect(screen.getByText('我的第一部漫画')).toBeInTheDocument();
    });

    // 输入搜索关键词
    const searchInput = screen.getByPlaceholderText('搜索作品标题或ID...');
    await user.type(searchInput, '漫画');

    // 验证API调用包含搜索参数
    await waitFor(() => {
      expect(apiClient.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('search=')
      );
    });
  });
});
