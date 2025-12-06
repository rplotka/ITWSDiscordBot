/**
 * File parsing utilities for SIS and LMS data files
 */
const XLSX = require('xlsx');
const logger = require('./logging');

/**
 * Semester codes mapping
 * 01 = Spring, 05 = Summer, 09 = Fall
 */
const SEMESTER_MAP = {
  '01': 'Spring',
  '05': 'Summer',
  '09': 'Fall',
};

/**
 * Parse a term code like "202601" into readable format
 * @param {string} termCode - e.g., "202601"
 * @returns {{ year: number, semester: string, display: string }}
 */
function parseTermCode(termCode) {
  if (!termCode || termCode.length !== 6) return null;

  const year = parseInt(termCode.substring(0, 4), 10);
  const semesterCode = termCode.substring(4, 6);
  const semester = SEMESTER_MAP[semesterCode] || 'Unknown';

  return {
    year,
    semester,
    semesterCode,
    display: `${semester} ${year}`,
  };
}

/**
 * Parse LMS term code like "2509" into readable format
 * @param {string} lmsTermCode - e.g., "2509" (YY + MM where 09=Fall, 01=Spring, 05=Summer)
 * @returns {{ year: number, semester: string, display: string }}
 */
function parseLmsTermCode(lmsTermCode) {
  if (!lmsTermCode || lmsTermCode.length !== 4) return null;

  const yearShort = parseInt(lmsTermCode.substring(0, 2), 10);
  const year = 2000 + yearShort;
  const semesterCode = lmsTermCode.substring(2, 4);
  const semester = SEMESTER_MAP[semesterCode] || 'Unknown';

  return {
    year,
    semester,
    semesterCode,
    display: `${semester} ${year}`,
  };
}

/**
 * Detect file type from filename
 * @param {string} filename
 * @returns {{ type: string, metadata: object }}
 */
function detectFileType(filename) {
  const lowerFilename = filename.toLowerCase();

  // SIS Class List: 202601_36419_classlist.xlsx
  const sisMatch = filename.match(/^(\d{6})_(\d+)_classlist\.xlsx$/i);
  if (sisMatch) {
    const term = parseTermCode(sisMatch[1]);
    return {
      type: 'sis_classlist',
      metadata: {
        termCode: sisMatch[1],
        term,
        crn: sisMatch[2],
      },
    };
  }

  // LMS Group Members: 20251206114838_2509_ITWS_1100_01_groupmembers.csv
  const lmsGroupMembersMatch = filename.match(
    /^(\d{14})_(\d{4})_([A-Z]+)_(\d{4})_(\d{2})_groupmembers\.csv$/i
  );
  if (lmsGroupMembersMatch) {
    const term = parseLmsTermCode(lmsGroupMembersMatch[2]);
    return {
      type: 'lms_groupmembers',
      metadata: {
        timestamp: lmsGroupMembersMatch[1],
        termCode: lmsGroupMembersMatch[2],
        term,
        department: lmsGroupMembersMatch[3].toUpperCase(),
        courseNumber: lmsGroupMembersMatch[4],
        section: lmsGroupMembersMatch[5],
        courseCode: `${lmsGroupMembersMatch[3].toUpperCase()}-${
          lmsGroupMembersMatch[4]
        }`,
      },
    };
  }

  // LMS Groups: 20251206114838_2509_ITWS_1100_01_groups.csv
  const lmsGroupsMatch = filename.match(
    /^(\d{14})_(\d{4})_([A-Z]+)_(\d{4})_(\d{2})_groups\.csv$/i
  );
  if (lmsGroupsMatch) {
    const term = parseLmsTermCode(lmsGroupsMatch[2]);
    return {
      type: 'lms_groups',
      metadata: {
        timestamp: lmsGroupsMatch[1],
        termCode: lmsGroupsMatch[2],
        term,
        department: lmsGroupsMatch[3].toUpperCase(),
        courseNumber: lmsGroupsMatch[4],
        section: lmsGroupsMatch[5],
        courseCode: `${lmsGroupsMatch[3].toUpperCase()}-${lmsGroupsMatch[4]}`,
      },
    };
  }

  // Generic CSV
  if (lowerFilename.endsWith('.csv')) {
    return {
      type: 'generic_csv',
      metadata: {},
    };
  }

  // Generic XLSX
  if (lowerFilename.endsWith('.xlsx') || lowerFilename.endsWith('.xls')) {
    return {
      type: 'generic_xlsx',
      metadata: {},
    };
  }

  return {
    type: 'unknown',
    metadata: {},
  };
}

/**
 * Parse SIS class list xlsx file
 * @param {Buffer} fileBuffer
 * @returns {{ courseInfo: object, students: array }}
 */
function parseSisClassList(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const result = {
    courseInfo: {},
    enrollmentCounts: {},
    students: [],
  };

  let inStudentSection = false;
  let studentHeaderIndex = -1;

  rows.forEach((row, index) => {
    if (!row || row.length === 0) return;

    const firstCell = String(row[0] || '').trim();
    const secondCell = String(row[1] || '').trim();

    // Parse course metadata
    if (firstCell === 'Course Title' && secondCell) {
      // "INTRO TO IT & WEB SCIENCE - ITWS 1100 01"
      const titleMatch = secondCell.match(
        /^(.+?)\s*-\s*([A-Z]+)\s*(\d+)\s*(\d+)$/
      );
      if (titleMatch) {
        const [, fullTitle, department, courseNumber, section] = titleMatch;
        result.courseInfo.fullTitle = fullTitle.trim();
        result.courseInfo.department = department;
        result.courseInfo.courseNumber = courseNumber;
        result.courseInfo.section = section;
        result.courseInfo.courseCode = `${department}-${courseNumber}`;
      } else {
        result.courseInfo.fullTitle = secondCell;
      }
    } else if (firstCell === 'Term' && secondCell) {
      // "Spring 2026 - 202601"
      const termMatch = secondCell.match(/^(.+?)\s*-\s*(\d{6})$/);
      if (termMatch) {
        const [, termDisplay, termCode] = termMatch;
        result.courseInfo.termDisplay = termDisplay.trim();
        result.courseInfo.termCode = termCode;
      }
    } else if (firstCell === 'CRN' && secondCell) {
      result.courseInfo.crn = secondCell;
    } else if (firstCell === 'Duration' && secondCell) {
      result.courseInfo.duration = secondCell;
    } else if (firstCell === 'Status' && secondCell) {
      result.courseInfo.status = secondCell;
    } else if (firstCell === 'Enrollment' && row.length >= 4) {
      result.enrollmentCounts.maximum = parseInt(row[1], 10) || 0;
      result.enrollmentCounts.actual = parseInt(row[2], 10) || 0;
      result.enrollmentCounts.remaining = parseInt(row[3], 10) || 0;
    }

    // Detect student section header
    if (firstCell === 'Student Name') {
      inStudentSection = true;
      studentHeaderIndex = index;
      return;
    }

    // Parse student rows
    if (inStudentSection && index > studentHeaderIndex) {
      const studentName = firstCell;
      const studentId = String(row[1] || '').trim();
      const registrationStatus = String(row[2] || '').trim();
      const level = String(row[3] || '').trim();
      const creditHours = String(row[4] || '').trim();
      const classYear = String(row[7] || '').trim();

      if (studentName && studentId) {
        // Parse name: "Last, First (Pronouns)" or "Last, \"Preferred\" First (Pronouns)"
        const nameMatch = studentName.match(
          /^([^,]+),\s*(?:"([^"]+)"\s+)?([^(]+?)(?:\s*\([^)]+\))?$/
        );

        let lastName = '';
        let firstName = '';
        let preferredName = '';

        if (nameMatch) {
          lastName = nameMatch[1].trim();
          preferredName = nameMatch[2] ? nameMatch[2].trim() : '';
          firstName = nameMatch[3].trim();
        } else {
          // Fallback parsing
          const parts = studentName.split(',');
          lastName = parts[0]?.trim() || '';
          firstName = parts[1]?.replace(/\([^)]+\)/g, '').trim() || '';
        }

        result.students.push({
          fullName: studentName,
          lastName,
          firstName,
          preferredName,
          studentId,
          registrationStatus,
          level,
          creditHours,
          classYear,
        });
      }
    }
  });

  logger.info(
    `Parsed SIS class list: ${result.students.length} students, course: ${result.courseInfo.courseCode}`
  );

  return result;
}

/**
 * Parse a CSV line handling quoted values
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  [...line].forEach((char, idx) => {
    if (char === '"') {
      if (inQuotes && line[idx + 1] === '"') {
        // Escaped quote handled in next iteration
        current += '"';
      } else if (!(inQuotes && line[idx - 1] === '"')) {
        // Toggle quotes unless this is the second of an escaped pair
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  });

  result.push(current);
  return result;
}

/**
 * Parse LMS group members CSV
 * @param {string} csvContent
 * @returns {{ students: array }}
 */
function parseLmsGroupMembers(csvContent) {
  const lines = csvContent.trim().split('\n');

  // Skip header row and parse each line
  const students = lines
    .slice(1)
    .map((line) => parseCSVLine(line))
    .filter((row) => row.length >= 5 && row[1] && row[1].trim())
    .map((row) => {
      const [groupCode, username, studentId, firstName, lastName] = row;
      return {
        groupCode: groupCode.trim(),
        rcsId: username.trim(),
        studentId: studentId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
      };
    });

  logger.info(`Parsed LMS group members: ${students.length} students`);
  return { students };
}

/**
 * Parse LMS groups CSV
 * @param {string} csvContent
 * @returns {{ groups: array }}
 */
function parseLmsGroups(csvContent) {
  const lines = csvContent.trim().split('\n');

  // Skip header row and parse each line
  const groups = lines
    .slice(1)
    .map((line) => parseCSVLine(line))
    .filter((row) => row.length >= 2 && row[0] && row[1])
    .map((row) => {
      const [groupCode, title] = row;
      // Extract team number from title like "Team 1" -> 1
      const teamMatch = title.match(/Team\s*(\d+)/i);
      const teamNumber = teamMatch ? parseInt(teamMatch[1], 10) : null;

      return {
        groupCode: groupCode.trim(),
        title: title.trim(),
        teamNumber,
      };
    });

  logger.info(`Parsed LMS groups: ${groups.length} groups`);
  return { groups };
}

/**
 * Parse a generic CSV file trying to detect columns
 * @param {string} csvContent
 * @returns {{ headers: array, students: array, detectedColumns: object }}
 */
function parseGenericCsv(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2)
    return { headers: [], students: [], detectedColumns: {} };

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Try to detect column meanings
  const detectedColumns = {
    username: headers.findIndex(
      (h) =>
        h.includes('username') ||
        h.includes('user name') ||
        h.includes('rcs') ||
        h === 'user'
    ),
    email: headers.findIndex((h) => h.includes('email')),
    studentId: headers.findIndex(
      (h) => h.includes('student id') || h.includes('studentid') || h === 'id'
    ),
    firstName: headers.findIndex(
      (h) => h.includes('first') || h === 'firstname' || h === 'given'
    ),
    lastName: headers.findIndex(
      (h) =>
        h.includes('last') ||
        h === 'lastname' ||
        h === 'surname' ||
        h === 'family'
    ),
    fullName: headers.findIndex(
      (h) => h.includes('name') && !h.includes('first') && !h.includes('last')
    ),
    team: headers.findIndex((h) => h.includes('team') || h.includes('group')),
    discordUsername: headers.findIndex((h) => h.includes('discord')),
  };

  // Parse data rows
  const students = lines
    .slice(1)
    .map((line) => parseCSVLine(line))
    .filter((row) => row.length > 0)
    .map((row) => {
      const student = { _raw: row };

      // Extract detected fields
      if (detectedColumns.username >= 0)
        student.rcsId = row[detectedColumns.username]?.trim();
      if (detectedColumns.email >= 0)
        student.email = row[detectedColumns.email]?.trim();
      if (detectedColumns.studentId >= 0)
        student.studentId = row[detectedColumns.studentId]?.trim();
      if (detectedColumns.firstName >= 0)
        student.firstName = row[detectedColumns.firstName]?.trim();
      if (detectedColumns.lastName >= 0)
        student.lastName = row[detectedColumns.lastName]?.trim();
      if (detectedColumns.fullName >= 0)
        student.fullName = row[detectedColumns.fullName]?.trim();
      if (detectedColumns.team >= 0)
        student.team = row[detectedColumns.team]?.trim();
      if (detectedColumns.discordUsername >= 0) {
        student.discordUsername = row[detectedColumns.discordUsername]?.trim();
      }

      // Build full name if not present
      if (!student.fullName && (student.firstName || student.lastName)) {
        student.fullName = `${student.firstName || ''} ${
          student.lastName || ''
        }`.trim();
      }

      return student;
    })
    .filter(
      (student) =>
        student.rcsId ||
        student.email ||
        student.studentId ||
        student.discordUsername
    );

  logger.info(`Parsed generic CSV: ${students.length} entries`);
  return { headers, students, detectedColumns };
}

/**
 * Main function to parse a file based on its type
 * @param {string} filename
 * @param {Buffer|string} content - Buffer for xlsx, string for csv
 * @returns {{ type: string, metadata: object, data: object }}
 */
async function parseFile(filename, content) {
  const fileInfo = detectFileType(filename);

  let data = {};

  switch (fileInfo.type) {
    case 'sis_classlist':
      data = parseSisClassList(content);
      break;
    case 'lms_groupmembers':
      data = parseLmsGroupMembers(content.toString());
      break;
    case 'lms_groups':
      data = parseLmsGroups(content.toString());
      break;
    case 'generic_csv':
      data = parseGenericCsv(content.toString());
      break;
    case 'generic_xlsx':
      // For generic xlsx, try to parse as class list
      data = parseSisClassList(content);
      break;
    default:
      throw new Error(`Unsupported file type: ${filename}`);
  }

  return {
    type: fileInfo.type,
    metadata: fileInfo.metadata,
    data,
  };
}

module.exports = {
  parseTermCode,
  parseLmsTermCode,
  detectFileType,
  parseSisClassList,
  parseLmsGroupMembers,
  parseLmsGroups,
  parseGenericCsv,
  parseCSVLine,
  parseFile,
};
