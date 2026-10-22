import { useWindowDimensions } from 'react-native';

/**
 * Universal Responsive Layout Hook for WhatsLandlord Mobile App
 * Supports all devices from 320px (Small Android phones) up to 1024px+ (Tablets / Foldables)
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width <= 360; // 320px - 360px
  const isMediumPhone = width > 360 && width < 480; // 375px - 414px
  const isLargePhone = width >= 480 && width < 768; // 480px - 720px
  const isPhone = width < 768;
  const isTablet = width >= 768; // 768px - 1024px+
  const isLargeTablet = width >= 1024;
  const isLandscape = width > height;

  // Responsive padding
  const paddingHorizontal = isSmallPhone ? 10 : isTablet ? 24 : 14;

  // Responsive container max width (centers cleanly on tablets)
  const maxContainerWidth = isLargeTablet ? 1024 : isTablet ? 780 : '100%';

  // Responsive card column width calculator for dashboards and grid lists
  const getCardWidth = (columns = 2, gap = 12) => {
    const activeWidth = isTablet ? Math.min(width, 1024) : width;
    const padding = paddingHorizontal * 2;
    const totalGaps = gap * (columns - 1);
    const availableWidth = activeWidth - padding - totalGaps;
    return Math.floor(availableWidth / columns);
  };

  return {
    width,
    height,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isPhone,
    isTablet,
    isLargeTablet,
    isLandscape,
    paddingHorizontal,
    maxContainerWidth,
    getCardWidth,
  };
};

export default useResponsive;
