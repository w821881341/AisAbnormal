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

package dk.dma.ais.abnormal.stat.tracker.events;

import com.google.common.base.Objects;
import dk.dma.ais.abnormal.stat.tracker.Track;

public class CellIdChangedEvent extends TrackingEvent {
    private final Integer oldCellId;

    public CellIdChangedEvent(Track track, Integer oldCellId) {
        super(track);
        this.oldCellId = oldCellId;
    }

    public final Integer getOldCellId() {
        return oldCellId;
    }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
                .add("mmsi", getTrack().getMmsi())
                .add("oldCellId", oldCellId)
                .add("newCellId", getTrack().getProperty(Track.CELL_ID))
                .toString();
    }
}
