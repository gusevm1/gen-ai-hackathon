'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileCard, type ProfileData } from '@/components/profiles/profile-card'
import { CreateProfileDialog } from '@/components/profiles/create-profile-dialog'
import { RenameProfileDialog } from '@/components/profiles/rename-profile-dialog'
import { DeleteProfileDialog } from '@/components/profiles/delete-profile-dialog'
import {
  createProfile,
  renameProfile,
  deleteProfile,
  duplicateProfile,
  setActiveProfile,
} from '@/app/(dashboard)/profiles/actions'

interface ProfileListProps {
  profiles: ProfileData[]
}

export function ProfileList({ profiles }: ProfileListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ProfileData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProfileData | null>(null)

  function handleCreate(name: string) {
    startTransition(async () => {
      try {
        await createProfile(name)
        router.refresh()
      } catch (err) {
        console.error('Failed to create profile:', err)
      }
    })
  }

  function handleRename(id: string, newName: string) {
    startTransition(async () => {
      try {
        await renameProfile(id, newName)
        router.refresh()
      } catch (err) {
        console.error('Failed to rename profile:', err)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProfile(id)
        router.refresh()
      } catch (err) {
        console.error('Failed to delete profile:', err)
      }
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      try {
        await duplicateProfile(id)
        router.refresh()
      } catch (err) {
        console.error('Failed to duplicate profile:', err)
      }
    })
  }

  function handleSetActive(id: string) {
    startTransition(async () => {
      try {
        await setActiveProfile(id)
        router.refresh()
      } catch (err) {
        console.error('Failed to set active profile:', err)
      }
    })
  }

  function handleEdit(id: string) {
    router.push(`/profiles/${id}`)
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">
          You don&apos;t have any profiles yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Create your first profile to start scoring listings.
        </p>
        <Button onClick={() => setCreateOpen(true)} size="lg">
          <Plus className="size-4" />
          Create Your First Profile
        </Button>
        <CreateProfileDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={handleCreate}
        />
      </div>
    )
  }

  return (
    <div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isOnly={profiles.length === 1}
            onEdit={() => handleEdit(profile.id)}
            onSetActive={() => handleSetActive(profile.id)}
            onRename={() => setRenameTarget(profile)}
            onDuplicate={() => handleDuplicate(profile.id)}
            onDelete={() => setDeleteTarget(profile)}
          />
        ))}
      </div>

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <RenameProfileDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
        currentName={renameTarget?.name ?? ''}
        onRename={(newName) => {
          if (renameTarget) handleRename(renameTarget.id, newName)
        }}
      />

      <DeleteProfileDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        profileName={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id)
        }}
      />
    </div>
  )
}
