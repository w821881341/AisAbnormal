/* Copyright (c) 2011 Danish Maritime Authority
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 */

package dk.dma.ais.abnormal.analyzer.behaviour.events;

import dk.dma.ais.abnormal.analyzer.behaviour.EventCertainty;
import dk.dma.ais.abnormal.event.db.domain.Event;
import dk.dma.ais.tracker.eventEmittingTracker.Track;

/**
 * AbnormalEventLower is posted on the event bus by the BehaviourManager when an abnormal event should be lowered.
 */
public class AbnormalEventLower extends AbnormalAbstractEvent {

    public AbnormalEventLower(Class<? extends Event> eventClass, Track track, EventCertainty eventCertainty) {
        super(eventClass, track, eventCertainty);
    }

}
