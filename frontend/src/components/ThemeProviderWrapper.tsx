import { ThemeProvider } from 'next-themes';

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

export const ThemeProviderWrapper = ({ children }: ThemeProviderWrapperProps) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
};