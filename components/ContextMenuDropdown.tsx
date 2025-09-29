import React from 'react';
import { ChevronRightIcon } from './Icons';

interface ContextMenuDropdownProps {
  summaryContent: React.ReactNode;
  children: React.ReactNode;
}

const ContextMenuDropdown: React.FC<ContextMenuDropdownProps> = ({ summaryContent, children }) => {
  return (
    <details className="group">
      <summary className="flex justify-between items-center w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-700 rounded transition-colors duration-150 cursor-pointer list-none">
        <div className="flex items-center gap-3">
            {summaryContent}
        </div>
        <div className="transition-transform duration-200 group-open:rotate-90">
          <ChevronRightIcon />
        </div>
      </summary>
      <div className="pl-4 pt-1">
        {children}
      </div>
    </details>
  );
};

export default ContextMenuDropdown;
