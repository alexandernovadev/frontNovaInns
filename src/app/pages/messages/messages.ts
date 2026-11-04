import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, MessageSquare, ClipboardCopy, ClipboardCheck } from 'lucide-angular';

interface MessageTemplate {
  id: string;
  title: string;
  icon: string;
  text: string;
}

@Component({
  selector: 'app-messages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="stack" style="--gap: var(--sp-5)">
      <header class="stack" style="--gap: 2px">
        <h2 class="sec-title">
          <lucide-icon [img]="MessageSquare" [size]="20" [strokeWidth]="2" />
          Mensajes
        </h2>
        <p class="page-sub">Plantillas de mensajes para huéspedes</p>
      </header>

      <div class="stack" style="--gap: var(--sp-4)">
        @for (tpl of templates; track tpl.id) {
          <article class="surface tpl" [class]="badgeClass(tpl.id)">
            <header class="tpl-head">
              <div class="row">
                <span class="badge">{{ tpl.icon }}</span>
                <h3>{{ tpl.title }}</h3>
              </div>
              <button (click)="copy(tpl.text, tpl.id)" data-size="sm" [attr.data-tone]="copiedId() === tpl.id ? 'success' : null" [attr.data-variant]="copiedId() === tpl.id ? null : 'soft'">
                <lucide-icon [img]="copiedId() === tpl.id ? ClipboardCheck : ClipboardCopy" [size]="16" [strokeWidth]="2.2" />
                {{ copiedId() === tpl.id ? 'Copiado' : 'Copiar' }}
              </button>
            </header>
            <pre>{{ tpl.text }}</pre>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .tpl { overflow: hidden; }
    .tpl-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5); border-bottom: var(--border) solid var(--line); }
    .tpl-head h3 { font-size: 1.05rem; }
    .badge { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 12px; font-weight: var(--fw-heavy); color: var(--c); background: var(--c-soft); }
    pre { margin: 0; padding: var(--sp-4) var(--sp-5); font-family: var(--font-body); font-size: var(--fs-small); line-height: 1.7; color: var(--text-1); white-space: pre-wrap; }
  `,
})
export class MessagesComponent {
  readonly MessageSquare = MessageSquare;
  readonly ClipboardCopy = ClipboardCopy;
  readonly ClipboardCheck = ClipboardCheck;

  copiedId = signal<string | null>(null);

  badgeClass(id: string): string {
    const map: Record<string, string> = {
      welcome: 'tint-mint',
      checkin: 'tint-sky',
      checkout: 'tint-lilac',
      pre_welcome: 'tint-butter',
      transport: 'tint-sky',
      taxi: 'tint-rose',
      improve_id: 'tint-peach',
    };
    return map[id] || 'tint-neutral';
  }

  async copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.set(id);
      setTimeout(() => this.copiedId.set(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.copiedId.set(id);
      setTimeout(() => this.copiedId.set(null), 2000);
    }
  }

  templates: MessageTemplate[] = [
    {
      id: 'welcome',
      title: 'Bienvenida — Previo a la llegada',
      icon: '✋',
      text: `¡Hola, [Nombre]! 👋✨ ¡Qué alegría saludarte! Estamos muy felices de que nos hayas elegido para tu estadía. 🏨🌈

Desde ya nos estamos preparando para que pases unos días increíbles y te sientas como en casa. Zipaquirá tiene una magia especial y nos encanta que vengas a descubrirla con nosotros. ✨⛪️

Aquí te comparto la info para que tu llegada sea perfecta:
📍 Ubicación: https://maps.app.goo.gl/WQt6XTFY9H7116rP9
🚗 Estacionamiento: Si vienes en carro o motos, contamos con parqueadero privado por un costo extra muy cómodo.
🚌 ¿Llegas desde el aeropuerto? Si necesitas indicaciones detalladas sobre cómo llegar en transporte público o privado desde el aeropuerto El Dorado hasta Zipaquirá, ¡avísame y con gusto te envío nuestra guía de llegada!

¡Cualquier cosa que necesites, pregúntame con toda confianza! ☕️🥐✨

¿A qué hora tienes previsto llegar? También cuéntame si necesitas el servicio de parqueadero para tener todo listo a tu llegada. 🚗✨`,
    },
    {
      id: 'pre_welcome',
      title: 'Pre-llegada (corto)',
      icon: '🏠',
      text: `¡Bienvenido a la familia de Apartamento Full Life! 🏠✨
Gracias de corazón por elegirnos para tu estancia. Nos hace mucha ilusión recibirte y queremos que cada detalle sea especial para ti.

Como nos encanta darte la bienvenida personalmente y entregarte las llaves en mano, por favor confírmanos:

• Tu hora estimada de llegada — así nos organizamos para estar allí esperándote con todo listo.
• Transporte — ¿vienes en carro para reservarte el espacio o necesitas que te orientemos con alguna ruta?

¡Cualquier cosa que necesites, aquí estamos para ayudarte! Nos vemos muy pronto. ✨`,
    },
    {
      id: 'checkin',
      title: 'Día del Check-in',
      icon: '🧼',
      text: `¡Hola, [Nombre]! 👋 ¿Cómo va todo? ✨

Por aquí ya tenemos el apto reluciente y con la mejor energía para recibirte. 🧼✨ Queremos que apenas llegues te sientas súper cómodo y empieces a disfrutar de tu descanso. 🛌💖

Avísame cuando estés cerca de Zipa para estar súper pendiente de ti y ayudarte con lo que necesites en tu entrada.

📲 ¡Buen camino! 🚗💨🌈`,
    },
    {
      id: 'checkout',
      title: 'Check-out (agradecimiento)',
      icon: '🙏',
      text: `¡Hola de nuevo, [Nombre]! 👋😊
Solo quería darte las gracias de corazón por haber pasado estos días con nosotros en Nova Inns. 🏠✨ Fue un gusto total conocerte y te agradezco muchísimo por haber dejado el apto en tan buenas condiciones, ¡de verdad se nota el cariño! 🤗

Espero que el regreso a casa sea súper tranquilo. 🚗💨 Si te gustó la experiencia y sientes que nos ganamos esas 5 estrellas, nos ayudarías un mundo dejándonos tu reseña en la plataforma. ⭐⭐⭐⭐⭐

¡Para nosotros significa todo!
¡Aquí tienes tu casa en Zipaquirá para cuando quieras volver! Un abrazo gigante. 🏔️❤️`,
    },
    {
      id: 'transport',
      title: 'Guía de transporte (Aeropuerto → Zipaquirá)',
      icon: '🚌',
      text: `Para llegar a Zipaquirá desde el aeropuerto El Dorado, estas son las mejores opciones:

— Opción 1: Transporte Público (Económica) —
1️⃣ Alimentador: Salgan del aeropuerto y busquen el bus verde (Alimentador) hacia el Portal El Dorado. Es gratuito.
2️⃣ Transmilenio: En el Portal El Dorado, tomen el bus que los lleve hacia el Portal Norte. El costo es de $3.100 COP (requiere tarjeta TuLlave).
3️⃣ Intermunicipal: Una vez en el Portal Norte, busquen los buses que dicen "Zipaquirá" (salen por la plataforma intermunicipal). El pasaje cuesta aproximadamente $11.500 COP.

— Opción 2: Mixta (Uber + Bus) —
Pueden tomar un Uber o aplicación desde el aeropuerto directamente hasta el Portal Norte. Es más rápido que el Transmilenio, aunque el costo varía según la hora. Una vez allí, toman el bus hacia Zipaquirá.

— Llegada a Zipaquirá —
Cuando estén cerca o lleguen al pueblo, sigan la ubicación que les envié. Si lo prefieren, puedo coordinar un taxi de confianza para que los recoja en la parada de Zipaquirá y los traiga al apartamento (valor: $10.000 COP).`,
    },
    {
      id: 'taxi',
      title: 'Llegada — Taxi esperando',
      icon: '🚖',
      text: `🚖 ¡Tu taxi ya está esperando!

Conductor: [Nombre]
Vehículo: LWL-630
Ubicación: Carrera 15 # 4 - [completar]
Valor: $10.000 COP

El taxi te está esperando en la dirección indicada. Si no lo ves, escríbeme y te ayudo a ubicarlo. 📲`,
    },
    {
      id: 'improve_id',
      title: 'Mejorar imagen de documento (prompt AI)',
      icon: '🪪',
      text: `IMPROVE IMAGE

Restore a low-quality scanned ID document to high-definition.
Fix blur, noise, and low contrast.
Reconstruct fine details carefully while preserving original content.
Sharpen text for readability without altering characters.
Remove stains, shadows, and uneven lighting.
Keep document authentic, no hallucinated text or changes.
Crisp, evenly lit, high-resolution archival scan quality.

NO USE PYTHON, use your image model.`,
    },
  ];
}
