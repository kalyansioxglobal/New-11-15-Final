# KPI Upload Test Guide - TT Marriott

## Test Files Created

### 1. STR Upload File: `test_str_upload.csv`
Contains external benchmarking data from STR.

### 2. Night Audit Upload File: `test_night_audit_upload.csv`
Contains internal operational data from night audit.

---

## Step-by-Step Testing Instructions

### Test 1: STR Upload

1. **Select Property**: Choose "TT Marriott" from the dropdown
2. **Upload File**: Select `test_str_upload.csv`
3. **Click**: "Upload STR"
4. **Expected Success Message**: 
   ```
   Successfully imported 3 STR rows for property [TT Marriott's ID]
   ```

### Test 2: Night Audit Upload

1. **Select Property**: Choose "TT Marriott" from the dropdown
2. **Upload File**: Select `test_night_audit_upload.csv`
3. **Click**: "Upload Night Audit"
4. **Expected Success Message**:
   ```
   Successfully imported 3 Night Audit rows for property [TT Marriott's ID]
   ```

---

## Expected Data in Database (HotelKpiDaily Table)

After both uploads, the final data should be:

| Date | Rooms Sold | Rooms Available | Occupancy % | ADR | RevPAR | Room Revenue | Total Revenue |
|------|------------|-----------------|-------------|-----|--------|--------------|---------------|
| 2024-01-07 | 103 | 150 | 68.67% | 145.50 | 99.89 | 14,986.50 | 14,986.50 |
| 2024-01-08 | 108 | 150 | 72.00% | 152.30 | 109.66 | 16,448.40 | 16,448.40 |
| 2024-01-09 | 99 | 150 | 66.00% | 138.90 | 91.67 | 13,751.10 | 13,751.10 |

**Note**: After Night Audit upload, it will OVERWRITE the STR data because both write to the same table. The Night Audit data takes precedence as it was uploaded last.

---

## Expected Output Verification Points

### 1. Recent KPI Uploads Table
After uploading, check the "Recent KPI Uploads" table. You should see:

**For STR Upload:**
- **Time**: Current timestamp
- **Property ID**: TT Marriott's ID
- **Source**: "STR" or "STR_UPLOAD"
- **Rows Imported**: 3
- **Date Range**: `2024-01-07 → 2024-01-09`

**For Night Audit Upload:**
- **Time**: Current timestamp
- **Property ID**: TT Marriott's ID
- **Source**: "NIGHT_AUDIT" or "NIGHT_AUDIT_UPLOAD"
- **Rows Imported**: 3
- **Date Range**: `2024-01-07 → 2024-01-09`

---

### 2. Verify at `/hotels/kpis` (Charts Tab)

1. Navigate to: `http://localhost:5000/hotels/kpis`
2. Go to **Charts** tab
3. Select **Property**: "TT Marriott" from the property dropdown
4. **Expected Charts**:
   - **RevPAR Chart**: Should show data points around $90-110
   - **ADR Chart**: Should show data points around $140-155
   - **Occupancy % Chart**: Should show data points around 66-72%

---

### 3. Verify at `/hotels/kpis` (YoY Report Tab)

1. Stay on `/hotels/kpis`
2. Go to **YoY Report** tab
3. Select **Hotel**: "TT Marriott" from dropdown
4. **Expected Display**:
   - **MTD Metrics**: If current month is January 2024, you should see:
     - Revenue: ~$45,186 (sum of 3 days)
     - Occupancy: ~69% (average)
     - ADR: ~$145 (average)
     - RevPAR: ~$100 (average)
   - **30-Day Trend Charts**: Should show 3 data points for Jan 7-9

---

### 4. Verify at `/hospitality/hotels/[id]` (Overview Tab)

1. Navigate to: `http://localhost:5000/hospitality/hotels/[TT Marriott's ID]`
2. Go to **Overview** tab
3. **Expected Summary Cards**:
   - **Avg Occ**: ~69% (average of 3 days)
   - **Avg ADR**: ~$145.57 (average)
   - **Avg RevPAR**: ~$100.41 (average)
   - **Total Revenue (7d)**: $45,186 (sum of 3 days)

4. **Expected Daily Metrics Table**:
   - Should show 3 rows for Jan 7, 8, 9
   - Each row showing: Rooms Sold, Occ %, ADR, RevPAR, Revenue

---

## Data Calculation Verification

### For 2024-01-07 (After Night Audit Upload):
- **Rooms Sold**: 103
- **Rooms Available**: 150
- **Occupancy %**: (103 / 150) × 100 = **68.67%**
- **Room Revenue**: $14,986.50
- **ADR**: $14,986.50 / 103 = **$145.50**
- **RevPAR**: $14,986.50 / 150 = **$99.89**
- **Total Revenue**: $14,986.50

### For 2024-01-08:
- **Rooms Sold**: 108
- **Occupancy %**: (108 / 150) × 100 = **72.00%**
- **ADR**: $16,448.40 / 108 = **$152.30**
- **RevPAR**: $16,448.40 / 150 = **$109.66**

### For 2024-01-09:
- **Rooms Sold**: 99
- **Occupancy %**: (99 / 150) × 100 = **66.00%**
- **ADR**: $13,751.10 / 99 = **$138.90**
- **RevPAR**: $13,751.10 / 150 = **$91.67**

---

## Important Notes

1. **Data Overwrite**: If you upload STR first, then Night Audit, the Night Audit data will overwrite the STR data for the same dates. This is expected behavior (upsert).

2. **Date Format**: The dates in the CSV files are in `YYYY-MM-DD` format (2024-01-07). Make sure your system accepts this format.

3. **Property ID**: Replace `[TT Marriott's ID]` in the URLs with the actual numeric ID from your database.

4. **Refresh Required**: After uploading, you may need to refresh the `/hotels/kpis` page to see the new data.

---

## Troubleshooting

**If upload fails:**
- Check that property is selected before uploading
- Verify CSV file format matches exactly (including column names)
- Check browser console for errors
- Verify file encoding is UTF-8

**If data doesn't appear:**
- Wait a few seconds and refresh the page
- Check that you selected the correct property in the charts/reports
- Verify the date range in filters includes Jan 7-9, 2024
- Check browser console for API errors

---

## Test Data Summary

**Total Test Records**: 3 days × 2 upload types = 6 records (but only 3 final due to overwrite)

**Date Range**: January 7-9, 2024

**Property**: TT Marriott (150 rooms)

**Final Expected Records**: 3 (after Night Audit overwrites STR data)

