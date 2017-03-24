//When trying to use this code, only copy from the first curly brace to the very last curly brace in the file.
//So don't copy `var ElevatorSaga =`
var ElevatorSaga = {
    waitingFloors: [], //A floor that needs to be serviced, and a direction that the passenger wants to go
    elevators: [],
    floors: [],

    /**
     *
     * @param {Array} elevators The elevators in play
     * @param {Array} floors    The floors in play
     */
    init: function (elevators, floors) {
        var ElevatorSaga = this;

        ElevatorSaga.elevators = elevators;
        ElevatorSaga.floors = floors;

        ElevatorSaga.elevators.forEach(function (elevator) {
            ElevatorSaga.initElevator(elevator);
        });

        ElevatorSaga.floors.forEach(function (floor) {
            floor.on('up_button_pressed', function () {
                ElevatorSaga.offerFloor(floor, "up");
            });
            floor.on('down_button_pressed', function () {
                ElevatorSaga.offerFloor(floor, "down");
            });
        });

    },

    /**
     * Initialize an elevator, setting all its movement logic
     *
     * @param {Elevator} elevator The elevator object
     */
    initElevator: function (elevator) {
        var ElevatorSaga = this;

        //Add a new property to the elevator object which will store the floor that the elevator is heading towards
        elevator.destinationFloor = null;
        /**
         * Get the floor that the elevator is heading toward
         *
         * @returns {null|*}
         */
        elevator.getDestinationFloor = function () {
            return this.destinationFloor;
        };

        /**
         * Set the floor that the elevator is heading to
         *
         * @param {int} floor The floor number that the elevator is heading towards
         */
        elevator.setDestinationFloor = function (floor) {
            this.destinationFloor = floor;
        };

        // Whenever the elevator is idle (has no more queued destinations)
        elevator.on("idle", function () {
            if (ElevatorSaga.waitingFloors.length > 0) {

                //Loop through the waiting floors and grab the closest one
                var closestFloor = -1;
                var floorDistance = 1000;
                var newWaitingFloors = [];
                ElevatorSaga.waitingFloors.forEach(function (waitingFloor) {
                    if (closestFloor < 0) {
                        closestFloor = waitingFloor.floorNum;
                        floorDistance = Math.abs(elevator.currentFloor() - waitingFloor);
                    } else if (elevator.currentFloor() - waitingFloor < floorDistance) {
                        //If the current floor subtract the waiting floor is closer than the previous closest floor, than that becomes to new target floor
                        closestFloor = waitingFloor.floorNum;
                        floorDistance = Math.abs(elevator.currentFloor() - waitingFloor);
                    } else {
                        newWaitingFloors.push(waitingFloor);
                    }
                });

                ElevatorSaga.waitingFloors = newWaitingFloors;

                var nextFloor = closestFloor;
                if (elevator.currentFloor() > nextFloor) {
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(false);
                } else {
                    elevator.goingUpIndicator(false);
                    elevator.goingDownIndicator(true);
                }
                elevator.goToFloor(nextFloor);
            }
        });

        elevator.on('floor_button_pressed', function (floorNum) {
            if (elevator.currentFloor() < floorNum) {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(false);
            } else {
                elevator.goingUpIndicator(false);
                elevator.goingDownIndicator(true);
            }
            elevator.goToFloor(floorNum);
        });

        elevator.on('stopped_at_floor', function (floorNum) {
            //Sort the destination queue
            elevator.destinationQueue.sort(ElevatorSaga.sortNumber);

            if (elevator.destinationQueue.length === 0) {
                //If there are no more destinations, then the elevator is open to go any direction
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(true);
            } else {
                //Update the indicator to show which direction the elevator is about to go
                var nextFloor = elevator.destinationQueue[0];
                elevator.setDestinationFloor(nextFloor);

                if (elevator.currentFloor() < nextFloor) {
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(false);
                } else {
                    //If the elevator is going down, then the array should be sorted in reverse order
                    elevator.destinationQueue.sort(ElevatorSaga.reverseSortNum);
                    elevator.goingUpIndicator(false);
                    elevator.goingDownIndicator(true);
                }
            }
        });

        //Check if the approaching floor has someone waiting, and if so, if the elevator can pick them up
        elevator.on('passing_floor', function (floorNum, direction) {
            if (elevator.loadFactor() < 0.6) {
                ElevatorSaga.floors.forEach(function (floor) {
                    /** @var {Floor} floor */
                    if (floor.floorNum() === floorNum) {
                        if (floor.buttonStates.up === 'activated' && elevator.goingUpIndicator()) {
                            //If the floor the elevator is approaching has someone waiting to go in the same direction, stop there
                            elevator.goToFloor(floor.floorNum(), true);
                        } else if (floor.buttonStates.down === 'activated' && elevator.goingDownIndicator()) {
                            elevator.goToFloor(floor.floorNum(), true);
                        }
                    }
                });
            }
        });
    },

    /**
     * Offer the activated floor to the elevators.
     * This will loop through all elevators and figure out the best one to service the current call
     *
     * @param {Floor}  floor     The floor that the button was pressed on
     * @param {string} direction The direction button that was pressed at the floor ("up" or "down")
     *
     * @var {Elevator} elevator
     */
    offerFloor: function (floor, direction) {
        var ElevatorSaga = this;

        //Get all elevators that can service the floor
        var availableElevators = [];
        ElevatorSaga.elevators.forEach(function (elevator) {
            //Check if an elevator is already heading to this floor and going in the same direction desired
            //If either true, reset availableElevators and return false, so the array should be empty
            if (elevator.getDestinationFloor() === floor && elevator.goingUpIndicator() && direction === "up") {
                availableElevators = [];
                return false;
            } else if (elevator.getDestinationFloor() === floor && elevator.goingDownIndicator() && direction === "down") {
                availableElevators = [];
                return false;
            }

            if (elevator.goingUpIndicator() && elevator.goingDownIndicator()) {
                availableElevators.push(elevator);
            } else if (elevator.currentFloor() < floor.floorNum() && elevator.goingUpIndicator() && direction == "up") {
                //The elevator needs to be below the floor, and moving up towards the floor, and the passenger wants to go up
                availableElevators.push(elevator);
            } else if (elevator.currentFloor() > floor.floorNum() && elevator.goingDownIndicator() && direction == "down") {
                //The elevator needs to be above the floor, and moving down towards the floor, and the passenger wants to go down
                availableElevators.push(elevator);
            }
        });

        if (availableElevators.length > 0) {
            var closestElevator = false;
            availableElevators.forEach(function (elevator) {
                if (!closestElevator) {
                    closestElevator = elevator;
                } else if (elevator.currentFloor() - floor.floorNum() < closestElevator.currentFloor() - floor.floorNum()) {
                    closestElevator = elevator;
                }
            });

            closestElevator.goToFloor(floor.floorNum())
        } else {
            ElevatorSaga.waitingFloors.push({
                floorNum: floor.floorNum(),
                direction: direction
            });
        }

    },

    /**
     * New array sorting function that will sort an array numerically, instead of the default alphabetically
     *
     * @param {int} a The first number to compare
     * @param {int} b The second number to compare
     */
    sortNumber: function (a, b) {
        return a - b;
    },

    /**
     * New array sorting function that will sort an array numerically, in reverse, instead of the default alphabetically
     *
     * @param {int} a The first number to compare
     * @param {int} b The second number to compare
     */
    reverseSortNum: function (a, b) {
        return b - a;
    },

    update: function (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
