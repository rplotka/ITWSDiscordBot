const { ModalSubmitInteraction } = require('discord.js');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {ModalSubmitInteraction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isModalSubmit() ||
      interaction.customId !== 'add-course-modal'
    )
      return;

    logger.info(`${interaction.member} submited the new course modal`);

    const val = (fieldName) => interaction.fields.getTextInputValue(fieldName);

    const courseTitle = val('add-course-modal-title');
    const courseShortTitle = val('add-course-modal-short-title');
    const courseInstructors = val('add-course-modal-instructors')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value);

    // const courseIsPublicField = interaction.fields.getField(
    //   'add-course-modal-is-public'
    // );
    const courseIsPublic = true; // = courseIsPublicField.value === 'yes';

    logger.info({
      courseTitle,
      courseShortTitle,
      courseInstructors,
      courseIsPublic,
    });
  },
};
