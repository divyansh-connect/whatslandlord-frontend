import React, { useState } from 'react';
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

  // Parse initial date
  const initialDate = value ? new Date(value) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() || new Date().getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
  
  // Fill empty leading cells for offset
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ key: `empty-${i}`, dayNum: null });
  }

  // Fill day numbers
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

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} allowFontScaling={false}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Controller */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel} allowFontScaling={false}>
              {months[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Titles */}
          <View style={styles.weekdayRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
              <Text key={index} style={styles.weekdayLabel} allowFontScaling={false}>{d}</Text>
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
                      isSelected && styles.dayCellSelected
                    ]}
                    onPress={() => handleSelectDay(item.dayNum)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected
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

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText} allowFontScaling={false}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface || '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder || '#334155',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary || '#f8fafc',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.inputBackground || '#0f172a',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary || '#f8fafc',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted || '#64748b',
  },
  gridContainer: {
    minHeight: 200,
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
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary || '#f8fafc',
  },
  dayTextSelected: {
    color: '#0f172a',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || '#334155',
    paddingTop: 10,
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
