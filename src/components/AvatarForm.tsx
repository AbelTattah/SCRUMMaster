"use client";

import { useRef } from "react";

import { updateAvatar } from "@/app/actions/profile";

export function AvatarForm({ avatar }: { avatar: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="avatar-form profile-photo"
      action={updateAvatar}
      encType="multipart/form-data"
    >
      <label className="avatar-picker" title="Change profile picture">
        <input
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            if (event.target.files?.length) {
              formRef.current?.requestSubmit();
            }
          }}
        />
        <img src={avatar} alt="Profile picture" />
        <span className="hint">Change</span>
      </label>

      <div className="profile-photo-text">
        <strong>Profile photo</strong>
        <span>JPEG, PNG, WebP or GIF — max 3 MB.</span>
      </div>
    </form>
  );
}
