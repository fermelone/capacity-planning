import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
export { customRender as render };