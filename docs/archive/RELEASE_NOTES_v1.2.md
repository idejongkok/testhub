# 🎉 Release Notes - v1.2.0

## New Features

### 1. ✅ Test Plan - Manage Cases by Suite

**What's New:**
- Test cases sekarang **digroup per suite** dengan accordion
- Checkbox **"Select All Suite"** untuk pilih semua test cases dalam satu suite
- Visual counter menunjukkan berapa test cases terpilih per suite
- Expand/collapse suite untuk navigation yang lebih mudah

**Benefits:**
- ✅ Tidak perlu scroll panjang mencari test case
- ✅ Pilih suite sekaligus dengan 1 klik
- ✅ Organize test plan berdasarkan feature/module
- ✅ Lebih cepat manage ratusan test cases

**How to Use:**
1. Go to **Test Plans**
2. Click **"Manage Cases"** on any test plan
3. Klik arrow **▶** untuk expand suite
4. Klik **checkbox di header suite** untuk select all cases dalam suite
5. Atau klik individual checkbox per test case
6. Click **"Save"**

**Screenshot:**
```
▼ ☑ Payment Tests (5/10)
  ☑ [Web] Credit Card Payment
  ☑ [API] Validate Transaction
  ☐ [Web] Refund Process
  ...

▶ ☐ User Management (0/8)
```

---

### 2. 📅 Test Plan - Calendar & Timeline View

**What's New:**
- **Timeline View**: List view dengan progress bar per test plan
- **Calendar View**: Monthly calendar grid showing test plans
- Status indicator: Active (hijau), Upcoming (biru), Completed (abu)
- Duration calculation & remaining days
- Quick navigation: Previous/Next month, Today button

**Benefits:**
- ✅ Visual overview jadwal testing
- ✅ Track progress real-time
- ✅ Identify overlapping test plans
- ✅ Easy planning & resource allocation
- ✅ QA team bisa koordinasi schedule

**How to Use:**
1. Go to **Test Plans**
2. Click **"Calendar"** button (top right)
3. Switch between **Timeline** or **Calendar** view
4. Navigate bulan dengan **◀ ▶** buttons
5. Click test plan untuk manage cases

**Timeline View Features:**
- Progress bar showing elapsed time
- Status badge (Active/Upcoming/Completed)
- Remaining days for active plans
- Duration in days
- Click to manage cases

**Calendar View Features:**
- Monthly grid (Sun - Sat)
- Plans shown on their date range
- Today highlighted
- Max 2 plans shown per day (+N more indicator)
- Click plan name to manage

---

## Technical Details

### Files Added:
1. **`src/components/ManageCasesBySuite.tsx`** - Modal dengan suite grouping
2. **`src/components/TestPlanCalendar.tsx`** - Calendar & timeline component
3. **`src/pages/TestPlansPage.tsx`** (updated) - Integrate new components

### Files Backed Up:
- **`src/pages/TestPlansPage.old.tsx`** - Original test plans page

### Dependencies:
- No new dependencies required
- Uses existing lucide-react icons

### Database:
- No schema changes
- Works with existing test_suites table

---

## Usage Tips

### For Test Plan Management:

**Best Practice - Group by Feature:**
```
Test Plan: "Sprint 23 Regression"
├─ Payment Module (15 cases)
│  ├─ Credit Card
│  ├─ E-Wallet
│  └─ Bank Transfer
├─ Auth Module (8 cases)
└─ Profile Module (12 cases)
```

**Select Strategy:**
- **Smoke Test**: Select only critical cases from each suite
- **Full Regression**: Select all suites
- **Feature Test**: Select specific suite only

### For Calendar Planning:

**Tips:**
1. **Avoid Overlaps**: Check calendar view untuk resource conflicts
2. **Plan Sprints**: Align test plans dengan sprint timeline
3. **Track Progress**: Use timeline view untuk daily standup
4. **Coordinate**: Share calendar view dengan team

**Example Schedule:**
```
Week 1-2: Sprint 23 Development
Week 3:   Sprint 23 Testing (Active - Green)
Week 4:   Sprint 24 Testing (Upcoming - Blue)
Past:     Sprint 22 Testing (Completed - Gray)
```

---

## Screenshots

### Manage Cases by Suite:
```
┌─────────────────────────────────────────┐
│ Manage Test Cases              [X]      │
├─────────────────────────────────────────┤
│ Selected: 15 test case(s)               │
│                                         │
│ ▼ ☑ Payment Tests         (10/10)      │
│   ☑ [Web] Credit Card Payment           │
│   ☑ [API] Validate Payment              │
│   ☑ [Web] Refund Process                │
│   ...                                   │
│                                         │
│ ▶ ☐ Auth Tests            (0/5)        │
│                                         │
│ ▼ ☑ Profile Tests         (5/8)        │
│   ☑ [Web] Update Profile                │
│   ☑ [API] Change Password               │
│   ☐ [Web] Upload Avatar                 │
│   ...                                   │
│                                         │
│              [Cancel]  [Save (15)]      │
└─────────────────────────────────────────┘
```

### Calendar Timeline View:
```
┌─────────────────────────────────────────┐
│ ◀ January 2026 ▶  [Today]              │
│           [Timeline] [Calendar]         │
├─────────────────────────────────────────┤
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ Sprint 23 Regression         Active ┃  │
│ ┃ Start: Jan 13  End: Jan 20          ┃  │
│ ┃ ████████████░░░░░░░░ 65%            ┃  │
│ ┃ 7 days / 3 days remaining           ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                         │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ Sprint 24 Testing      Upcoming    ┃  │
│ ┃ Start: Jan 27  End: Feb 3          ┃  │
│ ┃ ░░░░░░░░░░░░░░░░░░░░ 0%            ┃  │
│ ┃ 7 days                              ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└─────────────────────────────────────────┘
```

### Calendar Grid View:
```
┌─────────────────────────────────────────┐
│ Sun Mon Tue Wed Thu Fri Sat             │
├─────────────────────────────────────────┤
│      1   2   3  [4]  5   6              │
│                  ●                      │
│  7   8   9  10  11  12  13              │
│ Sprint 23 Sprint 23                     │
│                                         │
│ 14  15  16  17  18  19  20              │
│ Sprint 23        Sprint 24              │
│                                         │
│ 21  22  23  24  25  26  27              │
│                  Sprint 24              │
└─────────────────────────────────────────┘
```

---

## Migration

**No migration needed!** Features work with existing data.

**To enable:**
1. Extract zip
2. npm install (no new dependencies)
3. npm run dev
4. Features automatically available

---

## Known Limitations

1. **Calendar View**: Max 2 plans shown per day (show "+N more")
2. **Timeline View**: Shows current month only (navigate with ◀ ▶)
3. **Suite Grouping**: Only shows "ready" test cases (not draft/deprecated)

---

## Future Enhancements

**Planned for v1.3.0:**
- [ ] Drag & drop test cases between suites in manage modal
- [ ] Export calendar as iCal/PDF
- [ ] Email notifications untuk upcoming test plans
- [ ] Multi-select test plans in calendar
- [ ] Color coding per test plan
- [ ] Week view option
- [ ] Search/filter in manage cases modal

---

## Feedback

Kalau ada bug atau request Feature tambahan, let me know! 🚀

**Tested on:**
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Edge 120+

**Browser compatibility:**
- Timeline view: All modern browsers
- Calendar view: All modern browsers
- Suite grouping: All modern browsers
