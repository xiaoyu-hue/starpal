// SPDX-License-Identifier: AGPL-3.0-or-later
export { announcementAdminRouter } from './announcement.routes.js'
export { feedController as announcementsFeedController } from './announcement.controller.js'
export {
  createAnnouncement,
  getAdminList,
  getFeed,
  removeAnnouncement,
  updateAnnouncementByPatch,
} from './announcement.service.js'
export { BODY_MAX, SUMMARY_MAX, TITLE_MAX, parseCreate, parsePatch } from './announcement.schema.js'
export type {
  AnnouncementAdminItem,
  AnnouncementFeed,
  AnnouncementInput,
  AnnouncementKind,
  AnnouncementPatch,
  AnnouncementStatus,
  AnnouncementView,
} from './announcement.types.js'
