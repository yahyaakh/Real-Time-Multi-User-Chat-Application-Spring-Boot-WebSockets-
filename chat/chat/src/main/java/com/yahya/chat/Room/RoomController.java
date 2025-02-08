package com.yahya.chat.Room;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


@Controller
public class RoomController {

    // In-memory storage
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    @MessageMapping("/room.create")
    @SendTo("/topic/rooms")
    public Room createRoom(Room room) {
        System.out.println("Received room creation request: " + room);
        // Perform validation
        if (room.getName() == null || room.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Room name cannot be empty");
        }
        // If the room type is PUBLIC, ignore any password
        if (room.getType() == RoomType.Public) {
            room.setPassword(null);
        }
        // Store the room
        rooms.put(room.getName(), room);
        System.out.println("Room created: " + room);
        // Return the created room to all subscribers
        return room;
    }



    //method to retrieve all rooms
    @MessageMapping("/room.list")
    @SendTo("/topic/rooms")
    public Collection<Room> listRooms()
    {
        return rooms.values();
    }



    @MessageMapping("/Room.GetPassword")
    @SendTo("/topic/rooms")

    public String getRoomPassword(Room room) {
        return room.getPassword();
    }



    @MessageMapping("/Room.GetName")
    @SendTo("/topic/rooms")

    public String getRoomName(Room room) {

           return room.getName() ;
    }


}
