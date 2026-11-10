import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  effect,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import {
  LucideAngularModule,
  CalendarDays,
  Building2,
  LogIn,
  LogOut,
  User,
  Users,
  CreditCard,
  Banknote,
  Wallet,
  Pencil,
  MapPin,
  IdCard,
  MessageSquare,
  Moon,
  Hash,
  ZoomIn,
  ExternalLink,
  Sparkles,
  Clock,
} from 'lucide-angular';
import { BookingsService } from '../../core/services/bookings.service';
import { IBooking } from '../../core/interfaces';
import { ModalNova } from './modal-nova';
import { StatusBadge } from './status-badge';
import { PlatformIcon } from './platform-icon';
import { PaymentMethodIcon } from './payment-method-icon';
import { PhotoViewer } from './photo-viewer';
import { DateEsPipe } from '../pipes/date-es.pipe';
import { CurrencyCopPipe } from '../pipes/currency-cop.pipe';
import { CdnPipe } from '../pipes/cdn.pipe';
import { PLATFORM_CLASS, ID_LABELS, LIFECYCLE_CLASS } from '../constants/booking.constants';
import { apartmentColor, apartmentShortName } from '../utils/apartment-color';

export interface BookingCardQuery {
  guest: string;
  apartment?: string;
  apartmentId?: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  statuses?: string[];
  amount?: string;
  platform?: string;
  note?: string;
}

@Component({
  selector: 'booking-detail-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    NgTemplateOutlet,
    ModalNova,
    StatusBadge,
    PlatformIcon,
    PaymentMethodIcon,
    PhotoViewer,
    DateEsPipe,
    CurrencyCopPipe,
    CdnPipe,
  ],
  template: `
    <modal-nova
      [visible]="!!query()"
      [title]="modalTitle()"
      size="xl"
      (closed)="close()"
      [footerTemplate]="footerTpl">

      @if (loading()) {
        <div class="bdm-loading">
          <span class="orb-spin"><lucide-icon [img]="Sparkles" [size]="20" [strokeWidth]="2.2" /></span>
          <p class="small soft">Cargando detalle de la reserva…</p>
        </div>
      } @else if (booking(); as b) {
        <div class="bdm stack" style="--gap: var(--sp-4)">

          <!-- ── Hero colorido con plataforma, huésped, apartamento y badges ── -->
          <div class="bdm-hero" [style.--acc]="aptColor(b)">
            <div class="row between wrap" style="--gap: var(--sp-3); align-items: flex-start">
              <div class="row" style="--gap: var(--sp-3); min-width: 0; align-items: center">
                <span class="platform-box" [class]="PLATFORM_CLASS[b.billing.platform]">
                  <platform-icon [platform]="b.billing.platform" size="md" />
                </span>
                <div class="stack" style="--gap: 4px; min-width: 0">
                  <div class="row wrap" style="--gap: 8px; align-items: center">
                    <h3 class="bdm-guest truncate">{{ b.group.host.fullName }}</h3>
                    <span class="bdm-pax">{{ totalGuests(b) }} {{ totalGuests(b) === 1 ? 'huésped' : 'huéspedes' }}</span>
                  </div>
                  <div class="row wrap" style="--gap: 8px; align-items: center">
                    <span class="bdm-apt" [style.--c]="aptColor(b)">
                      <i></i>{{ aptName(b) }}
                    </span>
                    <span class="tiny muted row" style="--gap: 3px">
                      <lucide-icon [img]="Hash" [size]="11" [strokeWidth]="2.2" />
                      {{ b._id.slice(-8).toUpperCase() }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="row wrap" style="--gap: 6px; align-items: center">
                <span class="pill life" [class]="LIFECYCLE_CLASS[b.stay.status || 'PENDIENTE']">
                  {{ b.stay.status || 'PENDIENTE' }}
                </span>
                <status-badge [value]="b.billing.status" type="billing" />
              </div>
            </div>

            <!-- Barra rápida de KPIs de la reserva -->
            <div class="bdm-kpis">
              <div class="bdm-kpi tint-lilac">
                <span class="bdm-kpi-lbl"><lucide-icon [img]="Moon" [size]="12" [strokeWidth]="2.2" /> Noches</span>
                <b class="bdm-kpi-val">{{ nights(b) }} {{ nights(b) === 1 ? 'noche' : 'noches' }}</b>
              </div>
              <div class="bdm-kpi tint-butter">
                <span class="bdm-kpi-lbl"><lucide-icon [img]="Banknote" [size]="12" [strokeWidth]="2.2" /> Total</span>
                <b class="bdm-kpi-val num">{{ b.billing.totalAmount | currencyCop }}</b>
              </div>
              <div class="bdm-kpi tint-mint">
                <span class="bdm-kpi-lbl"><lucide-icon [img]="CreditCard" [size]="12" [strokeWidth]="2.2" /> Recibido</span>
                <b class="bdm-kpi-val num">{{ b.billing.amountReceived | currencyCop }}</b>
              </div>
              <div class="bdm-kpi" [class]="pending(b) > 0 ? 'tint-peach' : 'tint-mint'">
                <span class="bdm-kpi-lbl"><lucide-icon [img]="Wallet" [size]="12" [strokeWidth]="2.2" /> Pendiente</span>
                <b class="bdm-kpi-val num">{{ pending(b) | currencyCop }}</b>
              </div>
            </div>
          </div>

          <!-- ── Grid principal: Estancia + Facturación ── -->
          <div class="bdm-grid">

            <!-- Estancia -->
            <section class="surface panel tint-lilac">
              <header class="panel-head">
                <lucide-icon [img]="CalendarDays" [size]="16" [strokeWidth]="2.2" />
                Estancia
                <span class="spacer"></span>
                <span class="pill tint-lilac">
                  <lucide-icon [img]="Moon" [size]="12" [strokeWidth]="2.2" />
                  {{ nights(b) }} {{ nights(b) === 1 ? 'noche' : 'noches' }}
                </span>
              </header>
              <div class="bdm-stay">
                <div class="inset bdm-day">
                  <p class="kicker"><lucide-icon class="t-success" [img]="LogIn" [size]="14" [strokeWidth]="2.2" /> Check-in</p>
                  <p class="strong">{{ b.stay.checkIn | dateEs:'short' }}</p>
                  <p class="tiny strong t-success">{{ b.stay.checkIn | dateEs:'check' }}</p>
                </div>
                <div class="bdm-nights-sep">
                  <i></i>
                  <span class="bdm-nights-chip">{{ nights(b) }}n</span>
                  <i></i>
                </div>
                <div class="inset bdm-day">
                  <p class="kicker"><lucide-icon class="t-danger" [img]="LogOut" [size]="14" [strokeWidth]="2.2" /> Check-out</p>
                  <p class="strong">{{ b.stay.checkOut | dateEs:'short' }}</p>
                  <p class="tiny strong t-danger">{{ b.stay.checkOut | dateEs:'check' }}</p>
                </div>
              </div>

              @if (b.observations) {
                <div class="bdm-obs-wrap">
                  <p class="kicker"><lucide-icon [img]="MessageSquare" [size]="13" [strokeWidth]="2.2" /> Observaciones</p>
                  <div class="inset small bdm-obs">{{ b.observations }}</div>
                </div>
              }
            </section>

            <!-- Facturación -->
            <section class="surface panel tint-butter">
              <header class="panel-head">
                <lucide-icon [img]="CreditCard" [size]="16" [strokeWidth]="2.2" />
                Facturación
                <span class="spacer"></span>
                <span class="tiny soft">{{ b.billing.platform }}</span>
              </header>
              <div class="stack panel-body" style="--gap: var(--sp-3)">
                <div class="bdm-breakdown">
                  <div class="bdm-line">
                    <span class="row soft small" style="--gap: 6px">
                      <lucide-icon class="muted" [img]="Banknote" [size]="15" [strokeWidth]="1.9" />
                      Precio base ({{ nights(b) }} {{ nights(b) === 1 ? 'noche' : 'noches' }})
                    </span>
                    <span class="strong small num">{{ b.billing.basePrice | currencyCop }}</span>
                  </div>

                  @for (svc of b.billing.extraServices; track $index) {
                    <div class="bdm-line svc">
                      <div class="row between" style="--gap: var(--sp-2)">
                        <div class="row wrap" style="--gap: 6px; min-width: 0">
                          <span class="pill" [class]="svc.type === 'PARKING' ? 'tint-sky' : svc.type === 'LAUNDRY' ? 'tint-mint' : 'tint-lilac'">
                            {{ svc.type === 'PARKING' ? 'Parqueadero' : svc.type === 'LAUNDRY' ? 'Lavandería' : 'Extra' }}
                          </span>
                          @if (svc.type === 'PARKING' && svc.vehicleType) {
                            <span class="bdm-chip">{{ svc.vehicleType === 'CAR' ? 'Auto' : svc.vehicleType === 'MOTORCYCLE' ? 'Moto' : svc.vehicleType === 'BICYCLE' ? 'Bici' : 'Otro' }}</span>
                          }
                          @if (svc.type === 'LAUNDRY' && svc.weightKg) {
                            <span class="bdm-chip">{{ svc.weightKg }} kg</span>
                          }
                          <span class="small truncate">{{ svc.description }}</span>
                        </div>
                        <span class="strong small num nowrap">{{ svc.price * svc.quantity | currencyCop }}</span>
                      </div>
                      <p class="tiny muted">{{ svc.price | currencyCop }} × {{ svc.quantity }} unidad{{ svc.quantity !== 1 ? 'es' : '' }}</p>
                    </div>
                  }

                  <div class="bdm-line">
                    <span class="strong small">Total reserva</span>
                    <span class="display bdm-total num">{{ b.billing.totalAmount | currencyCop }}</span>
                  </div>
                </div>

                <!-- Barra de progreso -->
                <div class="stack" style="--gap: 6px">
                  <div class="row between tiny">
                    <span class="muted">Progreso de pago</span>
                    <span class="strong" [class]="paidPct(b) === 100 ? 't-success' : 't-warning'">{{ paidPct(b) }}%</span>
                  </div>
                  <div class="bar thick" [attr.data-tone]="paidPct(b) === 100 ? 'success' : 'warning'">
                    <span [style.width.%]="paidPct(b)"></span>
                  </div>
                </div>

                <!-- Método de pago -->
                <div class="inset row">
                  <lucide-icon class="muted" [img]="Wallet" [size]="15" [strokeWidth]="2" />
                  <span class="small soft">Método de pago</span>
                  <span class="spacer"></span>
                  <payment-method-icon [method]="b.billing.paymentMethod" size="sm" />
                  <span class="strong small">{{ b.billing.paymentMethod }}</span>
                </div>
              </div>
            </section>
          </div>

          <!-- ── Huéspedes (Titular + Acompañantes) ── -->
          <section class="surface panel tint-sky">
            <header class="panel-head">
              <lucide-icon [img]="Users" [size]="16" [strokeWidth]="2.2" />
              Huéspedes ({{ totalGuests(b) }})
            </header>
            <div class="panel-body bdm-guests-grid">
              <!-- Titular -->
              <div class="bdm-person primary">
                <div class="row between" style="--gap: 6px">
                  <span class="pill tint-butter">
                    <lucide-icon [img]="User" [size]="12" [strokeWidth]="2.2" />
                    Titular
                  </span>
                </div>
                <ng-container *ngTemplateOutlet="personTpl; context: { $implicit: b.group.host }" />
              </div>

              <!-- Acompañantes -->
              @for (member of b.group.members; track $index) {
                <div class="bdm-person">
                  <div class="row between" style="--gap: 6px">
                    <span class="pill tint-sky">
                      <span class="bdm-num">{{ $index + 2 }}</span>
                      Acompañante {{ $index + 1 }}
                    </span>
                  </div>
                  <ng-container *ngTemplateOutlet="personTpl; context: { $implicit: member }" />
                </div>
              }
            </div>
          </section>

          <!-- Metadatos pie -->
          <div class="row wrap between tiny muted" style="--gap: var(--sp-2)">
            <span class="row" style="--gap: 6px">
              <lucide-icon [img]="Clock" [size]="12" [strokeWidth]="2" />
              Creado {{ b.createdAt | dateEs }}
              @if (b.updatedAt) { · Editado {{ b.updatedAt | dateEs }} }
            </span>
            <span>ID: {{ b._id }}</span>
          </div>
        </div>
      } @else if (query(); as q) {
        <!-- Fallback si no se encontró en la BD -->
        <div class="bdm stack" style="--gap: var(--sp-4)">
          <div class="bdm-hero">
            <h3 class="bdm-guest">{{ q.guest }}</h3>
            @if (q.apartment) {
              <p class="small t-brand">{{ q.apartment }}</p>
            }
            <div class="bdm-kpis">
              <div class="bdm-kpi tint-lilac">
                <span class="bdm-kpi-lbl">Entrada</span>
                <b class="bdm-kpi-val">{{ q.checkIn | dateEs:'short' }}</b>
              </div>
              <div class="bdm-kpi tint-lilac">
                <span class="bdm-kpi-lbl">Salida</span>
                <b class="bdm-kpi-val">{{ q.checkOut | dateEs:'short' }}</b>
              </div>
              @if (q.nights) {
                <div class="bdm-kpi tint-mint">
                  <span class="bdm-kpi-lbl">Noches</span>
                  <b class="bdm-kpi-val">{{ q.nights }} {{ q.nights === 1 ? 'noche' : 'noches' }}</b>
                </div>
              }
              @if (q.amount) {
                <div class="bdm-kpi tint-butter">
                  <span class="bdm-kpi-lbl">Total</span>
                  <b class="bdm-kpi-val">{{ q.amount }}</b>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </modal-nova>

    <ng-template #personTpl let-p>
      <p class="display bdm-person-name">{{ p.fullName }}</p>
      <div class="row wrap" style="--gap: 6px">
        @if (p.idNumber) {
          <span class="bdm-chip lg"><lucide-icon [img]="IdCard" [size]="13" [strokeWidth]="1.9" /> {{ p.idNumber }}</span>
        }
        @if (p.birthDate) {
          <span class="bdm-chip lg"><lucide-icon [img]="CalendarDays" [size]="13" [strokeWidth]="1.9" /> {{ p.birthDate | dateEs }}</span>
        }
        @if (p.location?.countryName) {
          <span class="bdm-chip lg">
            <lucide-icon [img]="MapPin" [size]="13" [strokeWidth]="1.9" />
            {{ p.location.countryName }}{{ p.location.department ? ' · ' + p.location.department : '' }}{{ p.location.city ? ' · ' + p.location.city : '' }}
          </span>
        }
      </div>

      @if (p.identifications?.length) {
        <div class="bdm-ids">
          @for (photo of p.identifications; track photo.type) {
            <button type="button" class="bdm-id-photo" (click)="photoUrl.set(photo.url)">
              <img [src]="photo.url | cdn:320" alt="" loading="lazy" decoding="async" />
              <span class="bdm-zoom"><lucide-icon [img]="ZoomIn" [size]="22" [strokeWidth]="2" /></span>
              <span class="bdm-id-tag">{{ ID_LABELS[photo.type] || photo.type }}</span>
            </button>
          }
        </div>
      }
    </ng-template>

    <ng-template #footerTpl>
      <div class="row between wrap" style="--gap: var(--sp-2); width: 100%">
        <button type="button" data-variant="ghost" (click)="close()">Cerrar</button>
        @if (booking(); as b) {
          <div class="row" style="--gap: var(--sp-2)">
            <button type="button" data-size="sm" data-variant="soft" data-tone="brand" (click)="goEdit(b)">
              <lucide-icon [img]="Pencil" [size]="15" [strokeWidth]="2.2" />
              Editar
            </button>
            <button type="button" data-size="sm" data-tone="brand" (click)="goDetail(b)">
              <lucide-icon [img]="ExternalLink" [size]="15" [strokeWidth]="2.2" />
              Ir a la reserva
            </button>
          </div>
        }
      </div>
    </ng-template>

    <photo-viewer [url]="photoUrl()" (closed)="photoUrl.set(null)" />
  `,
  styles: `
    .bdm-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      padding: var(--sp-10) var(--sp-4);
    }
    .orb-spin {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: var(--ink);
      background: var(--brand);
      box-shadow: 0 3px 0 var(--brand-deep);
      animation: nova-spin 1.1s linear infinite;
    }

    /* Hero */
    .bdm-hero {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
      padding: var(--sp-4);
      background:
        radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--acc, var(--brand)) 16%, transparent), transparent 65%),
        var(--bg-0);
      border: var(--border) solid color-mix(in srgb, var(--acc, var(--brand)) 40%, var(--line));
      border-left: 5px solid var(--acc, var(--brand));
      border-radius: var(--r-md);
    }
    .bdm-guest {
      font-size: 1.25rem;
      line-height: 1.2;
      color: var(--text-1);
    }
    .bdm-pax {
      padding: 2px 9px;
      font-size: 11px;
      font-weight: var(--fw-heavy);
      color: var(--sky);
      background: var(--sky-soft);
      border: 1px solid color-mix(in srgb, var(--sky) 35%, transparent);
      border-radius: var(--r-full);
    }
    .bdm-apt {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: var(--fw-semibold);
      color: var(--c);
      background: color-mix(in srgb, var(--c) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
      border-radius: var(--r-full);
    }
    .bdm-apt i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); }

    /* KPIs rápidos */
    .bdm-kpis {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-2);
    }
    @media (width >= 40rem) {
      .bdm-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    .bdm-kpi {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      background: var(--c-soft);
      border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
      border-radius: var(--r-sm);
    }
    .bdm-kpi-lbl {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: var(--fw-heavy);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--c);
    }
    .bdm-kpi-val {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: var(--fw-heavy);
      color: var(--text-1);
    }

    /* Grid de 2 columnas para Estancia + Facturación */
    .bdm-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--sp-4);
      align-items: start;
    }
    @media (width >= 48rem) {
      .bdm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    /* Estancia */
    .bdm-stay {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      padding: var(--sp-4);
    }
    .bdm-day { flex: 1; }
    .bdm-nights-sep { display: flex; align-items: center; justify-content: center; gap: 6px; }
    .bdm-nights-sep i { flex: 1; height: 1px; background: var(--line); }
    .bdm-nights-chip {
      padding: 2px 10px;
      font-size: var(--fs-caption);
      font-weight: var(--fw-heavy);
      color: var(--lilac);
      background: var(--lilac-soft);
      border: 1px solid color-mix(in srgb, var(--lilac) 35%, transparent);
      border-radius: var(--r-full);
    }
    @media (width >= 36rem) {
      .bdm-stay { flex-direction: row; align-items: stretch; gap: 0; }
      .bdm-nights-sep { flex-direction: column; padding: 0 var(--sp-2); }
      .bdm-nights-sep i { width: 1px; height: auto; flex: 1; }
    }
    .bdm-obs-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 var(--sp-4) var(--sp-4);
    }
    .bdm-obs { line-height: 1.55; white-space: pre-line; color: var(--text-2); }

    /* Facturación */
    .bdm-breakdown { background: var(--bg-0); border-radius: var(--r-sm); }
    .bdm-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-3);
      padding: 10px var(--sp-3);
    }
    .bdm-line + .bdm-line { border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent); }
    .bdm-line.svc { display: block; }
    .bdm-line.svc > p { margin-top: 4px; }
    .bdm-total { font-size: 1.15rem; color: var(--brand); }
    .bar.thick { height: 8px; }

    /* Huéspedes */
    .bdm-guests-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--sp-3);
    }
    @media (width >= 44rem) {
      .bdm-guests-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .bdm-person {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      padding: var(--sp-3);
      background: var(--bg-0);
      border: 1px solid var(--line);
      border-radius: var(--r-sm);
    }
    .bdm-person.primary {
      border-color: color-mix(in srgb, var(--butter) 45%, var(--line));
    }
    .bdm-person-name { font-size: 1.05rem; color: var(--text-1); }
    .bdm-num {
      display: inline-grid;
      place-items: center;
      width: 16px;
      height: 16px;
      font-size: 10px;
      font-weight: var(--fw-heavy);
      border-radius: 50%;
      background: rgb(0 0 0 / 0.25);
    }
    .bdm-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      font-size: var(--fs-caption);
      font-weight: var(--fw-semibold);
      color: var(--text-2);
      background: var(--bg-2);
      border-radius: 8px;
    }
    .bdm-chip.lg {
      padding: 4px 10px;
      color: var(--text-1);
      background: var(--bg-1);
      border: 1px solid var(--line);
    }
    .bdm-chip lucide-icon { color: var(--text-3); }

    .bdm-ids {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-2);
      margin-top: 4px;
    }
    .bdm-id-photo {
      position: relative;
      aspect-ratio: 4 / 3;
      padding: 0;
      overflow: hidden;
      background: var(--bg-1);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .bdm-id-photo img { width: 100%; height: 100%; object-fit: contain; }
    .bdm-zoom {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: #fff;
      background: rgb(0 0 0 / 0.35);
      opacity: 0;
      transition: opacity var(--t-fast) ease;
    }
    .bdm-id-photo:hover .bdm-zoom { opacity: 1; }
    .bdm-id-tag {
      position: absolute;
      left: 6px;
      bottom: 6px;
      padding: 1px 7px;
      font-size: 10px;
      font-weight: var(--fw-heavy);
      color: #fff;
      background: rgb(0 0 0 / 0.65);
      border-radius: 6px;
    }
  `,
})
export class BookingDetailModal {
  readonly CalendarDays = CalendarDays;
  readonly Building2 = Building2;
  readonly LogIn = LogIn;
  readonly LogOut = LogOut;
  readonly User = User;
  readonly Users = Users;
  readonly CreditCard = CreditCard;
  readonly Banknote = Banknote;
  readonly Wallet = Wallet;
  readonly Pencil = Pencil;
  readonly MapPin = MapPin;
  readonly IdCard = IdCard;
  readonly MessageSquare = MessageSquare;
  readonly Moon = Moon;
  readonly Hash = Hash;
  readonly ZoomIn = ZoomIn;
  readonly ExternalLink = ExternalLink;
  readonly Sparkles = Sparkles;
  readonly Clock = Clock;

  readonly PLATFORM_CLASS = PLATFORM_CLASS;
  readonly LIFECYCLE_CLASS = LIFECYCLE_CLASS;
  readonly ID_LABELS = ID_LABELS;

  private bookingsService = inject(BookingsService);
  private router = inject(Router);

  query = input<BookingCardQuery | null>(null);
  closed = output<void>();

  booking = signal<IBooking | null>(null);
  loading = signal(false);
  photoUrl = signal<string | null>(null);

  modalTitle = computed(() => {
    const b = this.booking();
    if (b) return `Reserva · ${b.group.host.fullName}`;
    const q = this.query();
    return q ? `Reserva · ${q.guest}` : 'Detalle de reserva';
  });

  constructor() {
    effect(() => {
      const q = this.query();
      if (!q) {
        this.booking.set(null);
        this.loading.set(false);
        return;
      }
      this.lookup(q);
    });
  }

  private lookup(q: BookingCardQuery) {
    this.loading.set(true);
    this.booking.set(null);

    // La lista ya no trae las identificaciones (pesan), así que el detalle del
    // modal se toma por id: una sola lectura, solo cuando el usuario abre la ficha
    const open = (resumen: IBooking) =>
      this.bookingsService.findById(resumen._id).subscribe({
        next: (full) => {
          this.booking.set(full);
          this.loading.set(false);
        },
        // si el detalle no llega, al menos mostrar lo que ya trajimos
        error: () => {
          this.booking.set(resumen);
          this.loading.set(false);
        },
      });

    this.bookingsService
      .findAll({
        search: q.guest,
        apartmentId: q.apartmentId || undefined,
      })
      .subscribe({
        next: (res) => {
          const list = res.data ?? [];
          const iso = (d: string) => d.slice(0, 10);
          const exact =
            list.find(
              (b) => iso(b.stay.checkIn) === q.checkIn && iso(b.stay.checkOut) === q.checkOut,
            ) ??
            list.find((b) => iso(b.stay.checkIn) === q.checkIn) ??
            list[0] ??
            null;
          if (exact) open(exact);
          else {
            this.booking.set(null);
            this.loading.set(false);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  close() {
    this.closed.emit();
  }

  goDetail(b: IBooking) {
    this.close();
    this.router.navigate(['/bookings', b._id]);
  }

  goEdit(b: IBooking) {
    this.close();
    this.router.navigate(['/bookings', b._id, 'edit']);
  }

  nights(b: IBooking) {
    return this.bookingsService.nights(b);
  }
  pending(b: IBooking) {
    return this.bookingsService.pending(b);
  }
  paidPct(b: IBooking) {
    return this.bookingsService.paidPct(b);
  }
  totalGuests(b: IBooking) {
    return this.bookingsService.totalGuests(b);
  }
  aptName(b: IBooking) {
    return apartmentShortName(this.bookingsService.aptName(b));
  }
  aptColor(b: IBooking) {
    const a = b.apartmentId;
    return apartmentColor(typeof a === 'string' ? a : a?._id);
  }
}
