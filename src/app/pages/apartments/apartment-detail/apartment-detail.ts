import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApartmentsService } from '../../../core/services/apartments.service';
import { IApartment, IRoom, IBathroom } from '../../../core/interfaces';
import { ModalNova } from '../../../shared/components/modal-nova';
import { StatusBadge } from '../../../shared/components/status-badge';
import { AlertService } from '../../../shared/components/services/alert.service';
import {
  LucideAngularModule,
  Refrigerator,
  Flame,
  Microwave,
  Zap,
  ChefHat,
  Utensils,
  UtensilsCrossed,
  Tv,
  Shirt,
  Wind,
  Sofa,
  Bed,
  LayoutGrid,
  Car,
  Armchair,
  Package,
  Lamp,
  Layers,
  ShowerHead,
  Droplets,
  CloudRain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  ArrowLeft,
  Pencil,
  Trash2,
  Camera,
} from 'lucide-angular';

type Tab = 'general' | 'rooms' | 'bathrooms' | 'equipment' | 'photos';

@Component({
  selector: 'app-apartment-detail',
  imports: [FormsModule, LucideAngularModule, ModalNova, StatusBadge],
  templateUrl: './apartment-detail.html',
})
export class ApartmentDetailComponent implements OnInit {
  readonly Refrigerator = Refrigerator;
  readonly Flame = Flame;
  readonly Microwave = Microwave;
  readonly Zap = Zap;
  readonly ChefHat = ChefHat;
  readonly Utensils = Utensils;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Tv = Tv;
  readonly Shirt = Shirt;
  readonly Wind = Wind;
  readonly Sofa = Sofa;
  readonly Bed = Bed;
  readonly LayoutGrid = LayoutGrid;
  readonly Car = Car;
  readonly Armchair = Armchair;
  readonly Package = Package;
  readonly Lamp = Lamp;
  readonly Layers = Layers;
  readonly ShowerHead = ShowerHead;
  readonly Droplets = Droplets;
  readonly CloudRain = CloudRain;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertTriangle = AlertTriangle;
  readonly XCircle = XCircle;
  readonly Building2 = Building2;
  readonly ArrowLeft = ArrowLeft;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly Camera = Camera;

  private apartmentsService = inject(ApartmentsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alert = inject(AlertService);

  apartment = signal<IApartment | null>(null);
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

  readonly TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'rooms', label: 'Habitaciones', icon: Bed },
    { key: 'bathrooms', label: 'Baños', icon: ShowerHead },
    { key: 'equipment', label: 'Equipamiento', icon: Package },
    { key: 'photos', label: 'Fotos', icon: Camera },
  ];
  readonly STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.apartmentsService.findById(id).subscribe({
      next: (apt) => {
        this.apartment.set(this.normalize(apt));
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
    const id = this.apartment()?._id;
    if (!id) return;
    this.saving.set(true);
    this.apartmentsService
      .update(id, { internalName: this.editName.trim(), status: this.editStatus })
      .subscribe({
        next: (apt) => {
          this.apartment.set(apt);
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
    const apt = this.apartment();
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
    this.apartmentsService.update(apt._id, { rooms }).subscribe({
      next: (updated) => {
        this.apartment.set(updated);
        this.showRoomForm.set(false);
        this.saving.set(false);
        this.alert.success('Habitación guardada');
      },
      error: () => {
        this.saving.set(false);
        this.alert.error('Error al guardar habitación');
      },
    });
  }

  deleteRoom(room: IRoom) {
    const apt = this.apartment();
    if (!apt) return;
    const rooms = apt.rooms.filter((r: IRoom) => r._id !== room._id);
    this.apartmentsService.update(apt._id, { rooms }).subscribe({
      next: (updated) => this.apartment.set(updated),
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
    const apt = this.apartment();
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
    this.apartmentsService.update(apt._id, { bathrooms }).subscribe({
      next: (updated) => {
        this.apartment.set(updated);
        this.showBathForm.set(false);
        this.saving.set(false);
        this.alert.success('Baño guardado');
      },
      error: () => {
        this.saving.set(false);
        this.alert.error('Error al guardar baño');
      },
    });
  }

  deleteBath(bath: IBathroom) {
    const apt = this.apartment();
    if (!apt) return;
    const bathrooms = apt.bathrooms.filter((b: IBathroom) => b._id !== bath._id);
    this.apartmentsService.update(apt._id, { bathrooms }).subscribe({
      next: (updated) => this.apartment.set(updated),
    });
  }

  // ---- Equipment ----
  saveEquipment() {
    const apt = this.apartment();
    if (!apt) return;
    this.saving.set(true);
    this.apartmentsService
      .update(apt._id, { equipment: apt.equipment, parking: apt.parking })
      .subscribe({
        next: (updated) => {
          this.apartment.set(updated);
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
    const apt = this.apartment();
    if (!apt) return;
    this.uploadingPhoto.set(true);
    this.apartmentsService.uploadImage(file).subscribe({
      next: (res) => {
        this.apartmentsService
          .addPhoto(apt._id, { url: res.url, publicId: res.publicId })
          .subscribe({
            next: (updated) => {
              this.apartment.set(updated);
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
    const apt = this.apartment();
    if (!apt) return;
    this.apartmentsService.removePhoto(apt._id, publicId).subscribe({
      next: (updated) => this.apartment.set(updated),
    });
  }

  goBack() {
    this.router.navigate(['/apartments']);
  }
}
