import ApiResponse from "./apiResponse";

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
  constructor(
    statusCode: number,
    message: string,
    data: T[],
    pagination: PaginationMeta,
  ) {
    super(statusCode, message, data);
    this.pagination = pagination;
  }

  static build<T>(
    data: T[],
    totalItems: number,
    page: number,
    pageSize: number,
    message = "Data retrieved successfully",
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination: PaginationMeta = {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
    return new PaginatedResponse<T>(200, message, data, pagination);
  }

  static buildPagination(
    page: number,
    pageSize: number,
    totalItems: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}

export default PaginatedResponse;
