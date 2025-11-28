/**
 * Unit tests for utility functions
 */
const test = require('ava');
const {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
} = require('../core/utils');

test('addCourseModalFactory creates modal with correct structure', (t) => {
  const modal = addCourseModalFactory();
  const data = modal.toJSON();

  t.is(data.custom_id, 'add-course-modal');
  t.is(data.title, 'Add Course');
  t.is(data.components.length, 4); // Four input fields: title, short, instructor, teams

  // Check first field (title)
  const titleField = data.components[0].components[0];
  t.is(titleField.custom_id, 'add-course-title');
  t.is(titleField.label, "What's the FULL name of the course?");
  t.true(titleField.required);

  // Check second field (short title)
  const shortTitleField = data.components[1].components[0];
  t.is(shortTitleField.custom_id, 'add-course-short');
  t.is(shortTitleField.label, "What's the SHORT name of the course?");

  // Check third field (instructor)
  const instructorField = data.components[2].components[0];
  t.is(instructorField.custom_id, 'add-course-instructor');
  t.is(instructorField.label, 'Instructor username/nickname');

  // Check fourth field (teams)
  const teamsField = data.components[3].components[0];
  t.is(teamsField.custom_id, 'add-course-teams');
  t.is(teamsField.label, 'Number of teams (0 for none)');
});

test('addCourseModalFactory supports prefill values', (t) => {
  const modal = addCourseModalFactory({
    name: 'Test Course',
    short: 'test',
    instructor: 'testuser',
    teams: 5,
  });
  const data = modal.toJSON();

  const titleField = data.components[0].components[0];
  t.is(titleField.value, 'Test Course');

  const shortField = data.components[1].components[0];
  t.is(shortField.value, 'test');

  const instructorField = data.components[2].components[0];
  t.is(instructorField.value, 'testuser');

  const teamsField = data.components[3].components[0];
  t.is(teamsField.value, '5');
});

test('courseSelectorActionRowFactory creates selector with correct custom ID', (t) => {
  const mockCourses = [
    { id: 1, title: 'Test Course 1', instructors: ['instructor1'] },
    { id: 2, title: 'Test Course 2', instructors: ['instructor2'] },
  ];

  const row = courseSelectorActionRowFactory('join', mockCourses);
  const rowData = row.toJSON();
  const selectMenu = rowData.components[0];

  t.is(selectMenu.custom_id, 'join-course');
  t.is(selectMenu.options.length, 2);
  t.is(selectMenu.options[0].label, 'Test Course 1');
  t.is(selectMenu.options[0].value, '1');
  t.is(selectMenu.options[1].label, 'Test Course 2');
  t.is(selectMenu.options[1].value, '2');
});

test('courseSelectorActionRowFactory handles empty courses array', (t) => {
  const row = courseSelectorActionRowFactory('leave', []);
  const rowData = row.toJSON();
  const selectMenu = rowData.components[0];

  t.is(selectMenu.custom_id, 'leave-course');
  t.is(selectMenu.options.length, 0);
});

test('courseSelectorActionRowFactory supports all action types', (t) => {
  const mockCourses = [{ id: 1, title: 'Test', instructors: [] }];

  // Test each action type maps to correct custom ID
  const actions = {
    join: 'join-course',
    leave: 'leave-course',
    remove: 'remove-course',
    clear: 'clear-course',
    'add-teams': 'add-team-select',
    'remove-teams': 'remove-team-select',
    'add-students': 'add-students-course',
  };

  Object.entries(actions).forEach(([action, expectedId]) => {
    const row = courseSelectorActionRowFactory(action, mockCourses);
    const rowData = row.toJSON();
    t.is(
      rowData.components[0].custom_id,
      expectedId,
      `Action '${action}' should use custom ID '${expectedId}'`
    );
  });
});

test('courseTeamSelectorActionRowFactory creates selector with correct structure', (t) => {
  const mockCourseTeams = [
    {
      id: 1,
      title: 'Team Alpha',
      Course: { title: 'Test Course 1' },
    },
    {
      id: 2,
      title: 'Team Beta',
      Course: { title: 'Test Course 2' },
    },
  ];

  const row = courseTeamSelectorActionRowFactory('join', mockCourseTeams);
  const rowData = row.toJSON();
  const selectMenu = rowData.components[0];

  t.is(selectMenu.custom_id, 'join-team');
  t.is(selectMenu.options.length, 2);
  t.is(selectMenu.options[0].label, 'Team Alpha');
  t.is(selectMenu.options[0].description, 'Test Course 1');
  t.is(selectMenu.options[0].value, '1');
});

test('courseTeamSelectorActionRowFactory handles leave action', (t) => {
  const mockCourseTeams = [
    {
      id: 1,
      title: 'Team Alpha',
      Course: { title: 'Test Course 1' },
    },
  ];

  const row = courseTeamSelectorActionRowFactory('leave', mockCourseTeams);
  const rowData = row.toJSON();
  const selectMenu = rowData.components[0];

  t.is(selectMenu.custom_id, 'leave-team');
});
