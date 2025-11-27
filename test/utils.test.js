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
  t.is(data.components.length, 3); // Three input fields

  // Check first field (title)
  const titleField = data.components[0].components[0];
  t.is(titleField.custom_id, 'add-course-modal-title');
  t.is(titleField.label, "What's the FULL name of the course?");
  t.true(titleField.required);

  // Check second field (short title)
  const shortTitleField = data.components[1].components[0];
  t.is(shortTitleField.custom_id, 'add-course-modal-short-title');
  t.is(shortTitleField.label, "What's the SHORT name of the course?");

  // Check third field (instructors)
  const instructorsField = data.components[2].components[0];
  t.is(instructorsField.custom_id, 'add-course-modal-instructors');
  t.is(instructorsField.label, 'Who is instructing the course?');
});

test('courseSelectorActionRowFactory creates selector with correct custom ID', (t) => {
  const mockCourses = [
    { id: 1, title: 'Test Course 1', instructors: ['instructor1'] },
    { id: 2, title: 'Test Course 2', instructors: ['instructor2'] },
  ];

  const row = courseSelectorActionRowFactory('join', mockCourses);
  const rowData = row.toJSON();
  const selectMenu = rowData.components[0];

  t.is(selectMenu.custom_id, 'course-join');
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

  t.is(selectMenu.custom_id, 'course-leave');
  t.is(selectMenu.options.length, 0);
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

  t.is(selectMenu.custom_id, 'course-team-join');
  t.is(selectMenu.options.length, 2);
  t.is(selectMenu.options[0].label, 'Team Alpha (Test Course 1)');
  t.is(selectMenu.options[0].value, '1');
});
