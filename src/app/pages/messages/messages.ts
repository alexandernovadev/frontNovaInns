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
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-text-primary text-2xl font-bold flex items-center gap-2">
            <lucide-icon [img]="MessageSquare" class="w-6 h-6 text-brand" [strokeWidth]="2" />
            Mensajes
          </h1>
          <p class="text-text-secondary text-sm mt-0.5">Plantillas de mensajes para huéspedes</p>
        </div>
      </div>

      <div class="space-y-4">
        @for (tpl of templates; track tpl.id) {
          <div class="bg-surface border border-border rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                  [class]="badgeClass(tpl.id)">
                  {{ tpl.icon }}
                </span>
                <h2 class="text-text-primary font-semibold text-sm">{{ tpl.title }}</h2>
              </div>
              <button (click)="copy(tpl.text, tpl.id)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
                [class]="copiedId() === tpl.id ? 'bg-success/15 text-success' : 'bg-brand/10 text-brand hover:bg-brand/20'">
                <lucide-icon [img]="copiedId() === tpl.id ? ClipboardCheck : ClipboardCopy" class="w-3.5 h-3.5" [strokeWidth]="2" />
                {{ copiedId() === tpl.id ? 'Copiado' : 'Copiar' }}
              </button>
            </div>
            <div class="px-5 py-4">
              <pre class="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">{{ tpl.text }}</pre>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MessagesComponent {
  readonly MessageSquare = MessageSquare;
  readonly ClipboardCopy = ClipboardCopy;
  readonly ClipboardCheck = ClipboardCheck;

  copiedId = signal<string | null>(null);

  badgeClass(id: string): string {
    const map: Record<string, string> = {
      welcome: 'bg-emerald-500/15 text-emerald-400',
      checkin: 'bg-blue-500/15 text-blue-400',
      checkout: 'bg-purple-500/15 text-purple-400',
      pre_welcome: 'bg-amber-500/15 text-amber-400',
      transport: 'bg-cyan-500/15 text-cyan-400',
    };
    return map[id] || 'bg-surface text-text-secondary';
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

  templates: ({
    id: string;
    title: string;
    icon: string;
    text: string;
  })[] = [
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
  ];
}
