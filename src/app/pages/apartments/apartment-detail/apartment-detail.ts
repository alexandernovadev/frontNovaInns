import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApartmentsService,
  IApartment,
  IRoom,
  IBathroom,
} from '../../../core/services/apartments.service';

type Tab = 'general' | 'rooms' | 'bathrooms' | 'equipment' | 'photos';

@Component({
  selector: 'app-apartment-detail',
  imports: [FormsModule],
  templateUrl: './apartment-detail.html',
})
export class ApartmentDetailComponent implements OnInit {
  private svc = inject(ApartmentsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  apt = signal<IApartment | null>(null);
  loading = signal(true);
  saving = signal(false);
  tab = signal<Tab>('general');

  // General tab — inline edit
  editName = '';
  editStatus: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' = 'ACTIVE';

  // Rooms
  showRoomForm = signal(false);
  editingRoom = signal<IRoom | null>(null);
  roomForm: IRoom = this.blankRoom();

  // Bathrooms
  showBathForm = signal(false);
  editingBath = signal<IBathroom | null>(null);
  bathForm: IBathroom = this.blankBath();

  // Photos
  uploadingPhoto = signal(false);

  readonly TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'rooms', label: 'Habitaciones' },
    { key: 'bathrooms', label: 'Baños' },
    { key: 'equipment', label: 'Equipamiento' },
    { key: 'photos', label: 'Fotos' },
  ];

  readonly STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Activo',
    MAINTENANCE: 'Mantenimiento',
    INACTIVE: 'Inactivo',
  };
  readonly STATUS_CLASS: Record<string, string> = {
    ACTIVE: 'bg-success/10 text-success',
    MAINTENANCE: 'bg-warning/10 text-warning',
    INACTIVE: 'bg-error/10 text-error',
  };
  readonly STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.findById(id).subscribe({
      next: (apt) => {
        this.apt.set(this.normalize(apt));
        this.syncGeneralForm(apt);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/apartments']);
      },
    });
  }

  private normalize(apt: IApartment): IApartment {
    apt.equipment ??= {} as any;
    apt.equipment.kitchen ??= {} as any;
    apt.equipment.kitchen.appliances ??= { fridges: 0, stoves: 0, microwaves: 0, blenders: 0 };
    apt.equipment.kitchen.cookware ??= { pots: 0, pans: 0 };
    apt.equipment.kitchen.seating ??= { diningSillas: 0 };
    apt.equipment.electronics ??= { tvs: 0, irons: 0, hairDryers: 0 };
    apt.equipment.furniture ??= { sofas: 0, sofaBeds: 0, rugs: 0, diningTables: 0 };
    apt.parking ??= { totalSpots: 0 };
    return apt;
  }

  private syncGeneralForm(apt: IApartment) {
    this.editName = apt.internalName;
    this.editStatus = apt.status;
  }

  // ---- General ----
  saveGeneral() {
    const id = this.apt()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.update(id, { internalName: this.editName.trim(), status: this.editStatus }).subscribe({
      next: (apt) => {
        this.apt.set(apt);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  // ---- Rooms ----
  blankRoom(): IRoom {
    return {
      name: '',
      furniture: { beds: 0, closets: 0, nightstands: 0 },
      windows: { curtains: 0, sheers: 0 },
      inventory: { hangers: 0, pillows: 0 },
    };
  }

  openAddRoom() {
    this.editingRoom.set(null);
    this.roomForm = this.blankRoom();
    this.showRoomForm.set(true);
  }

  openEditRoom(room: IRoom) {
    this.editingRoom.set(room);
    this.roomForm = structuredClone(room);
    this.showRoomForm.set(true);
  }

  saveRoom() {
    const apt = this.apt();
    if (!apt) return;
    this.saving.set(true);
    const rooms = structuredClone(apt.rooms);
    const editing = this.editingRoom();
    if (editing) {
      const idx = rooms.findIndex((r: IRoom) => r._id === editing._id);
      if (idx !== -1) rooms[idx] = { ...this.roomForm, _id: editing._id };
    } else {
      rooms.push(this.roomForm);
    }
    this.svc.update(apt._id, { rooms }).subscribe({
      next: (updated) => {
        this.apt.set(updated);
        this.showRoomForm.set(false);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  deleteRoom(room: IRoom) {
    const apt = this.apt();
    if (!apt) return;
    const rooms = apt.rooms.filter((r: IRoom) => r._id !== room._id);
    this.svc.update(apt._id, { rooms }).subscribe({
      next: (updated) => this.apt.set(updated),
    });
  }

  // ---- Bathrooms ----
  blankBath(): IBathroom {
    return { name: '', fixtures: { toilets: 0, sinks: 0, electricShowers: 0 } };
  }

  openAddBath() {
    this.editingBath.set(null);
    this.bathForm = this.blankBath();
    this.showBathForm.set(true);
  }

  openEditBath(bath: IBathroom) {
    this.editingBath.set(bath);
    this.bathForm = structuredClone(bath);
    this.showBathForm.set(true);
  }

  saveBath() {
    const apt = this.apt();
    if (!apt) return;
    this.saving.set(true);
    const bathrooms = structuredClone(apt.bathrooms);
    const editing = this.editingBath();
    if (editing) {
      const idx = bathrooms.findIndex((b: IBathroom) => b._id === editing._id);
      if (idx !== -1) bathrooms[idx] = { ...this.bathForm, _id: editing._id };
    } else {
      bathrooms.push(this.bathForm);
    }
    this.svc.update(apt._id, { bathrooms }).subscribe({
      next: (updated) => {
        this.apt.set(updated);
        this.showBathForm.set(false);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  deleteBath(bath: IBathroom) {
    const apt = this.apt();
    if (!apt) return;
    const bathrooms = apt.bathrooms.filter((b: IBathroom) => b._id !== bath._id);
    this.svc.update(apt._id, { bathrooms }).subscribe({
      next: (updated) => this.apt.set(updated),
    });
  }

  // ---- Equipment ----
  saveEquipment() {
    const apt = this.apt();
    if (!apt) return;
    this.saving.set(true);
    this.svc.update(apt._id, { equipment: apt.equipment, parking: apt.parking }).subscribe({
      next: (updated) => {
        this.apt.set(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  // ---- Photos ----
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const apt = this.apt();
    if (!apt) return;
    this.uploadingPhoto.set(true);
    this.svc.uploadImage(file).subscribe({
      next: (res) => {
        this.svc.addPhoto(apt._id, { url: res.url, publicId: res.publicId }).subscribe({
          next: (updated) => {
            this.apt.set(updated);
            this.uploadingPhoto.set(false);
          },
          error: () => this.uploadingPhoto.set(false),
        });
      },
      error: () => this.uploadingPhoto.set(false),
    });
    input.value = '';
  }

  removePhoto(publicId: string) {
    const apt = this.apt();
    if (!apt) return;
    this.svc.removePhoto(apt._id, publicId).subscribe({
      next: (updated) => this.apt.set(updated),
    });
  }

  goBack() {
    this.router.navigate(['/apartments']);
  }
}
