package com.example.pl_connect.player;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class PlayerService {


    private final PlayerRepository playerRepository;

    @Autowired
    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }
    public List<Player> getPlayers() {
        return playerRepository.findAll();
    }

    public List<Player> getPlayersFromTeam(String teamName) {
        return playerRepository.findAll().stream()
                .filter(player -> Objects.equals(teamName, player.getTeam()))
                .collect(Collectors.toList());
    }

    public List<Player> getPlayersByName(String searchText) {
        String q = searchText.toLowerCase();
        return playerRepository.findAll().stream()
                .filter(player -> Optional.ofNullable(player.getName())
                        .map(n -> n.toLowerCase().contains(q))
                        .orElse(false))
                .collect(Collectors.toList());
    }

    public List<Player> getPlayersByPos(String searchText) {
        String q = searchText.toLowerCase();
        return playerRepository.findAll().stream()
                .filter(player -> Optional.ofNullable(player.getPos())
                        .map(p -> p.toLowerCase().contains(q))
                        .orElse(false))
                .collect(Collectors.toList());
    }

    public List<Player> getPlayersByNation(String searchText) {
        String q = searchText.toLowerCase();
        return playerRepository.findAll().stream()
                .filter(player -> Optional.ofNullable(player.getNation())
                        .map(n -> n.toLowerCase().contains(q))
                        .orElse(false))
                .collect(Collectors.toList());
    }

    public List<Player> getPlayersByTeamAndPosition(String team, String position){
        return playerRepository.findAll().stream()
                .filter(player -> Objects.equals(team, player.getTeam())
                        && Objects.equals(position, player.getPos()))
                .collect(Collectors.toList());
    }
    public Player addPlayer(Player player) {
        playerRepository.save(player);
        return player;
    }
    public Player updatePlayer(Player updatedPlayer) {
        Optional<Player> existingPlayer = playerRepository.findByName(updatedPlayer.getName());

        if (existingPlayer.isPresent()) {
            Player playerToUpdate = existingPlayer.get();
            playerToUpdate.setName(updatedPlayer.getName());
            playerToUpdate.setTeam(updatedPlayer.getTeam());
            playerToUpdate.setPos(updatedPlayer.getPos());
            playerToUpdate.setNation(updatedPlayer.getNation());
            playerRepository.save(playerToUpdate);
            return playerToUpdate;
        }
        return null;
    }
    @Transactional
    public void deletePlayer(String playerName) {
        playerRepository.deleteByName(playerName);
    }
}
