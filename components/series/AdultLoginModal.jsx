"use client";

import LoginGateModal from "../layout/LoginGateModal";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";

export default function AdultLoginModal({ open, onClose, onSubmit, errorMessage }) {
  return (
    <LoginGateModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={LOGIN_GATE_TITLE}
      description={LOGIN_GATE_DESCRIPTION}
      errorMessage={errorMessage}
    />
  );
}
