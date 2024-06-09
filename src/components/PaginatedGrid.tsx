import { ReactNode, useState } from "react";

const ITEMS_PER_PAGE = 50;

interface PaginatedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}

export function PaginatedGrid<T>({ items, renderItem }: PaginatedGridProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  const displayedItems = items.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];

    // Add the first 3 pages
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
      pageNumbers.push(i);
    }

    // Add dots if there's a gap
    if (currentPage > 3) {
      pageNumbers.push("...");
    }

    // Add the current page and neighbors
    for (
      let i = Math.max(4, currentPage - 1);
      i <= Math.min(totalPages - 3, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i);
    }

    // Add dots if there's a gap
    if (currentPage < totalPages - 2) {
      pageNumbers.push("...");
    }

    // Add the last 3 pages
    for (let i = Math.max(totalPages - 2, 1); i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedItems.map((item, index) => renderItem(item, index))}
      </div>
      <div className="flex justify-center mt-4">
        {renderPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`p-2 mx-1 border ${
              page === currentPage ? "bg-gray-300" : ""
            }`}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={typeof page !== "number"}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
