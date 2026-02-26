/**
 * AdminOrdersPageNew的状态管理Reducer
 * 这个SB文件把所有散乱的useState合并成一个useReducer
 * 让状态管理变得清晰优雅，不再是一坨屎山
 */

export const initialOrdersState = {
  // 数据相关
  orders: [],
  filteredOrders: [],

  // 过滤和搜索
  query: '',
  statusFilter: 'all',
  dateFrom: '',
  dateTo: '',

  // UI状态
  viewMode: 'list', // 'list' | 'grid'
  loading: true,
  error: null,

  // 选择状态
  selectedIds: [],

  // 模态框状态
  adjustModal: { open: false, order: null },
  adjustForm: { paidDelta: '', bonusDelta: '' },

  // 分页状态
  currentPage: 1,
  pageSize: 10,
  totalCount: 0,
};

export function ordersReducer(state, action) {
  switch (action.type) {
    // 数据操作
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        totalCount: action.payload.length,
      };

    case 'SET_FILTERED_ORDERS':
      return {
        ...state,
        filteredOrders: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    // 过滤和搜索
    case 'SET_QUERY':
      return {
        ...state,
        query: action.payload,
        currentPage: 1, // 重置分页
      };

    case 'SET_STATUS_FILTER':
      return {
        ...state,
        statusFilter: action.payload,
        currentPage: 1,
      };

    case 'SET_DATE_RANGE':
      return {
        ...state,
        dateFrom: action.payload.from,
        dateTo: action.payload.to,
        currentPage: 1,
      };

    // UI状态
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };

    // 选择状态
    case 'SET_SELECTED_IDS':
      return {
        ...state,
        selectedIds: action.payload,
      };

    case 'CLEAR_SELECTED_IDS':
      return {
        ...state,
        selectedIds: [],
      };

    // 模态框操作
    case 'OPEN_ADJUST_MODAL':
      return {
        ...state,
        adjustModal: { open: true, order: action.payload },
        adjustForm: { paidDelta: '', bonusDelta: '' },
      };

    case 'CLOSE_ADJUST_MODAL':
      return {
        ...state,
        adjustModal: { open: false, order: null },
        adjustForm: { paidDelta: '', bonusDelta: '' },
      };

    case 'SET_ADJUST_FORM':
      return {
        ...state,
        adjustForm: {
          ...state.adjustForm,
          ...action.payload,
        },
      };

    // 分页
    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.payload,
      };

    case 'SET_PAGE_SIZE':
      return {
        ...state,
        pageSize: action.payload,
        currentPage: 1,
      };

    // 批量操作
    case 'RESET_FILTERS':
      return {
        ...initialOrdersState,
        orders: state.orders,
        loading: false,
      };

    default:
      return state;
  }
}

/**
 * 计算分页后的订单列表
 */
export function getPaginatedOrders(filteredOrders, currentPage, pageSize) {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return filteredOrders.slice(startIndex, endIndex);
}

/**
 * 计算总页数
 */
export function getTotalPages(totalCount, pageSize) {
  return Math.ceil(totalCount / pageSize);
}
