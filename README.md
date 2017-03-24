# ElevatorSaga Solution

This repo contains my attempted solution at the [ElevatorSaga](http://play.elevatorsaga.com) programming game.

### How far does it get
My solution will pass all of the levels that required X number of people to be transported within X seconds after
a few goes (if not right away).

### Where does it fall short
It has trouble with the challanges requiring X number of people to be transported without letting anyone
wait more than X seconds.

### Why does it fall short
The issue with my code is that multiple elevators will service a floor at the same time, which is inefficient because
only one needs to, so I need to fix the way floors are assigned to elevators.