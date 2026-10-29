import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme';

export const CustomDatePicker = ({ visible, value, onSelect, onClose }) => {
  const { colors } = useThemeColors();
  const styles = getStyles(colors);

  const parseDateToParts = (val) => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.includes('-')) {
        const p = trimmed.split('-');
        if (p.length === 3) {
          if (p[0].length === 4) {
            const y = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            const d = parseInt(p[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
          } else {
            const m = parseInt(p[0], 10) - 1;
            const d = parseInt(p[1], 10);
            const y = parseInt(p[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
          }
        }
      }
      if (trimmed.includes('/')) {
        const p = trimmed.split('/');
        if (p.length === 3) {
          if (p[0].length === 4) {
            const y = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            const d = parseInt(p[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
          } else {
            const m = parseInt(p[0], 10) - 1;
            const d = parseInt(p[1], 10);
            const y = parseInt(p[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
          }
        }
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Parse initial date
  const initialDate = parseDateToParts(value);
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );
  // viewMode: 'calendar' | 'years' | 'months'
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    if (visible) {
      const d = parseDateToParts(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
      setViewMode('calendar');
    }
  }, [visible, value]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Generate Year list: 1940 to 2035 (96 years)
  const yearsList = [];
  for (let y = 2035; y >= 1940; y--) {
    yearsList.push(y);
  }

  // Get total days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Compile calendar days array
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ key: `empty-${i}`, dayNum: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ key: `day-${i}`, dayNum: i });
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onSelect(selectedDateStr);
    onClose();
  };

  const handleSelectYear = (year) => {
    setCurrentYear(year);
    setViewMode('calendar');
  };

  const handleSelectMonth = (monthIdx) => {
    setCurrentMonth(monthIdx);
    setViewMode('calendar');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title} allowFontScaling={false}>
                {viewMode === 'years'
                  ? 'Select Year'
                  : viewMode === 'months'
                  ? 'Select Month'
                  : 'Select Date'}
              </Text>
              {viewMode !== 'calendar' && (
                <TouchableOpacity
                  style={styles.backToCalBtn}
                  onPress={() => setViewMode('calendar')}
                >
                  <Ionicons name="arrow-back" size={14} color="#38bdf8" />
                  <Text style={styles.backToCalText} allowFontScaling={false}>Calendar</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Controller */}
          <View style={styles.monthNav}>
            <View style={styles.navArrowsGroup}>
              <TouchableOpacity
                onPress={() => setCurrentYear(currentYear - 1)}
                style={styles.navBtnSmall}
                accessibilityLabel="Previous Year"
              >
                <Ionicons name="play-back" size={13} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.navBtn}
                accessibilityLabel="Previous Month"
              >
                <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Clickable Month & Year Selectors */}
            <View style={styles.selectorsRow}>
              <TouchableOpacity
                style={[
                  styles.selectorBadge,
                  viewMode === 'months' && styles.selectorBadgeActive,
                ]}
                onPress={() => setViewMode(viewMode === 'months' ? 'calendar' : 'months')}
              >
                <Text
                  style={[
                    styles.selectorBadgeText,
                    viewMode === 'months' && styles.selectorBadgeTextActive,
                  ]}
                  allowFontScaling={false}
                >
                  {months[currentMonth]}
                </Text>
                <Ionicons
                  name={viewMode === 'months' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={viewMode === 'months' ? '#38bdf8' : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorBadge,
                  viewMode === 'years' && styles.selectorBadgeActive,
                ]}
                onPress={() => setViewMode(viewMode === 'years' ? 'calendar' : 'years')}
              >
                <Text
                  style={[
                    styles.selectorBadgeText,
                    viewMode === 'years' && styles.selectorBadgeTextActive,
                  ]}
                  allowFontScaling={false}
                >
                  {currentYear}
                </Text>
                <Ionicons
                  name={viewMode === 'years' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={viewMode === 'years' ? '#38bdf8' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.navArrowsGroup}>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navBtn}
                accessibilityLabel="Next Month"
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCurrentYear(currentYear + 1)}
                style={styles.navBtnSmall}
                accessibilityLabel="Next Year"
              >
                <Ionicons name="play-forward" size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* VIEW: YEARS GRID */}
          {viewMode === 'years' && (
            <View style={styles.yearsContainer}>
              <Text style={styles.viewModeHint} allowFontScaling={false}>
                Tap a year to jump directly
              </Text>
              <ScrollView
                style={styles.yearsScrollView}
                contentContainerStyle={styles.yearsGrid}
                showsVerticalScrollIndicator={true}
              >
                {yearsList.map((y) => {
                  const isCurrent = y === currentYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.yearChip,
                        isCurrent && styles.yearChipActive,
                      ]}
                      onPress={() => handleSelectYear(y)}
                    >
                      <Text
                        style={[
                          styles.yearChipText,
                          isCurrent && styles.yearChipTextActive,
                        ]}
                        allowFontScaling={false}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* VIEW: MONTHS GRID */}
          {viewMode === 'months' && (
            <View style={styles.monthsContainer}>
              <Text style={styles.viewModeHint} allowFontScaling={false}>
                Tap a month to jump directly
              </Text>
              <View style={styles.monthsGrid}>
                {shortMonths.map((m, idx) => {
                  const isCurrent = idx === currentMonth;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.monthChip,
                        isCurrent && styles.monthChipActive,
                      ]}
                      onPress={() => handleSelectMonth(idx)}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          isCurrent && styles.monthChipTextActive,
                        ]}
                        allowFontScaling={false}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* VIEW: CALENDAR DAYS */}
          {viewMode === 'calendar' && (
            <>
              {/* Weekday Titles */}
              <View style={styles.weekdayRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
                  <Text key={index} style={styles.weekdayLabel} allowFontScaling={false}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.gridContainer}>
                <FlatList
                  data={calendarCells}
                  numColumns={7}
                  keyExtractor={(item) => item.key}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    if (item.dayNum === null) {
                      return <View style={styles.dayCellEmpty} />;
                    }
                    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
                    const formattedDay = String(item.dayNum).padStart(2, '0');
                    const thisDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
                    const isSelected = value === thisDateStr;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                        ]}
                        onPress={() => handleSelectDay(item.dayNum)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                          ]}
                          allowFontScaling={false}
                        >
                          {item.dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => {
                const now = new Date();
                const nowY = now.getFullYear();
                const nowM = String(now.getMonth() + 1).padStart(2, '0');
                const nowD = String(now.getDate()).padStart(2, '0');
                onSelect(`${nowY}-${nowM}-${nowD}`);
                onClose();
              }}
            >
              <Text style={styles.todayBtnText} allowFontScaling={false}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText} allowFontScaling={false}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.70)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface || '#1e293b',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder || '#334155',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder || '#334155',
      paddingBottom: 10,
      marginBottom: 10,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
    },
    backToCalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    backToCalText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#38bdf8',
    },
    monthNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    navArrowsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    navBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.inputBackground || '#0f172a',
      justifyContent: 'center',
      alignItems: 'center',
    },
    navBtnSmall: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.inputBackground || '#0f172a',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectorsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.inputBackground || '#0f172a',
      borderWidth: 1,
      borderColor: colors.cardBorder || '#334155',
    },
    selectorBadgeActive: {
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    selectorBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
    },
    selectorBadgeTextActive: {
      color: '#38bdf8',
    },
    viewModeHint: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted || '#94a3b8',
      marginBottom: 8,
      textAlign: 'center',
    },
    // Years Grid
    yearsContainer: {
      height: 240,
    },
    yearsScrollView: {
      flex: 1,
    },
    yearsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingBottom: 10,
    },
    yearChip: {
      width: '23%',
      paddingVertical: 10,
      marginVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.inputBackground || '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder || '#334155',
    },
    yearChipActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    yearChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary || '#f8fafc',
    },
    yearChipTextActive: {
      color: '#0f172a',
      fontWeight: '800',
    },
    // Months Grid
    monthsContainer: {
      height: 240,
    },
    monthsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    monthChip: {
      width: '31%',
      paddingVertical: 14,
      marginVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.inputBackground || '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder || '#334155',
    },
    monthChipActive: {
      backgroundColor: '#38bdf8',
      borderColor: '#38bdf8',
    },
    monthChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary || '#f8fafc',
    },
    monthChipTextActive: {
      color: '#0f172a',
      fontWeight: '800',
    },
    // Days Grid
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 6,
    },
    weekdayLabel: {
      width: 36,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted || '#64748b',
    },
    gridContainer: {
      minHeight: 210,
    },
    dayCell: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 2,
      borderRadius: 18,
    },
    dayCellEmpty: {
      width: 36,
      height: 36,
      margin: 2,
    },
    dayCellSelected: {
      backgroundColor: '#38bdf8',
    },
    dayText: {
      fontSize: 12.5,
      fontWeight: '500',
      color: colors.textPrimary || '#f8fafc',
    },
    dayTextSelected: {
      color: '#0f172a',
      fontWeight: '800',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder || '#334155',
      paddingTop: 10,
    },
    todayBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    todayBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#38bdf8',
    },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    closeBtnText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary || '#cbd5e1',
    },
  });

export default CustomDatePicker;
