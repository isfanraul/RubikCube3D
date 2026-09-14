// Rubik Cube class
function RubikCube() {
    this.moving = true // block motion state
    this.isGameOver = false
    THREE.Mesh.call(this, this.oGeo, this.oMate) //this inherits Mesh
    this.init() // Initialize the block
    this.drop(false) // block drop
    window.castShape && this.castShape() // projection
}

RubikCube.prototype = {
    constructor: RubikCube,
    oGeo: new THREE.Geometry(),
    oMate: new THREE.MeshBasicMaterial(),
    // Type species (two-dimensional chiral structure does not exist in three-dimensional space)
    catagories: ["I", "Z", "L", "T", "X"],
    // projection
    castShape: function() {
        var that = this
        newoCan.remove(that.cast)
        var newRubikCube = new THREE.Mesh(that.geometry, new THREE.MeshBasicMaterial({
            wireframe: true
        }))
        that.init.call(newRubikCube, true, that.catagory)
        newRubikCube.position.y = that.position.y - that.collisionCheck().bottomDistance + 1
        newRubikCube.position.x = that.position.x
        newRubikCube.position.z = that.position.z
            // Ensure that the projection is normal when deformed
        newRubikCube.children.forEach(function(el, index) {
            var position = that.children[index].position
            el.position.set(position.x, position.y, position.z)
        });
        that.cast = newRubikCube
        newoCan.add(that.cast)
    },
    pause: function() {
        window.pause = !window.pause
        this.drop(window.pause)
    },
    // elimination layer
    destroy: function() {
        this.moveCtrl = function() {}
        var cubes = oCantainer.children,
            floor = (function() {
                var arr = [];
                for (var i = 0; i < 40; i++) {
                    arr.push([])
                }
                return arr
            })()
        cubes.forEach(function(outterEl) {
            outterEl.children.forEach(function(innerEl) {
                floor.forEach(function(floorArr, index) {
                    if (innerEl.getFixd()[1] == index - 10) {
                        floorArr.push(innerEl)
                    }
                })
            })
        })

        floor.forEach(function(floorArr, index) {
            if (floorArr.length >= 49) {
                window.score += 100
                floorArr.forEach(function(cube) {
                    cube.parent.remove(cube)
                })
                floor.forEach(function(floorArr, innerIndex) {
                        if (innerIndex > index) {
                            floorArr.forEach(function(cube) {
                                cube.position.y -= 1
                            })
                        }
                    })
                    // Scores can be updated here
                document.querySelector("#score").textContent = "Score: " + window.score
            }
        })
    },
    // Fall and Accelerated Fall
    drop: function(accelerate) {
        var that = this
        if (!this.isGameOver) {
            clearInterval(that.timer)
            if (accelerate === false) {
                // normal fall
                that.timer = setInterval(function() {
                    if (!that.collisionCheck().bottom && !this.isGameOver) {
                        that.position.y -= 1
                    } else {
                        that.moving = false
                        that.destroy()
                        newoCan.remove(that.cast)
                        clearInterval(that.timer)
                    }
                }, 1600)
            } else if (accelerate == "accelerate") {
                // accelerated fall
                that.timer = setInterval(function() {
                    if (!that.collisionCheck().bottom && !this.isGameOver) {
                        that.position.y -= 1
                    } else {
                        that.moving = false
                        that.destroy()
                        newoCan.remove(that.cast)
                        clearInterval(that.timer)
                    }
                }, 5)
            }
        }else{
            
        }

    },
    // Impact checking
    collisionCheck: function() {
        var arr = {
            canTransform: true,
            bottomDistance: []
        }
        var movingCube = this.children
        var staticRubikCubes = oCantainer.children,
            staticCubes = []
        for (var i = 0; i < staticRubikCubes.length; i++) {
            if (!staticRubikCubes[i].moving) {
                staticCubes = staticCubes.concat(staticRubikCubes[i].children)
            }
        }

        if (staticCubes.length == 0) {
            movingCube.forEach(function(el) {
                el.getFixd()[1] === -10 && (arr.bottom = true)
                el.getFixd()[2] === 3 && (arr.far = true)
                el.getFixd()[2] === -3 && (arr.near = true)
                el.getFixd()[0] === -3 && (arr.left = true)
                el.getFixd()[0] === 3 && (arr.right = true)
                if (el.parent.catagory == "X" || el.parent.catagory == "T") {
                    arr.bottomDistance = el.getFixd()[1] + 10
                } else if (el.parent.catagory == "I") {
                    arr.bottomDistance = el.getFixd()[1] + 8
                } else {
                    arr.bottomDistance = el.getFixd()[1] + 9
                }

                // If it sticks out of the wall after being deformed, it is determined that it cannot be deformed here.
                if (el.getFixd()[1] < -10 || el.getFixd()[2] > 3 ||
                    el.getFixd()[2] < -3 || el.getFixd()[0] < -3 ||
                    el.getFixd()[0] > 3
                ) {
                    arr.canTransform = false
                }
            });
            return arr
        } else {
            movingCube.forEach(function(movingEl, index) {
                arr.bottomDistance[index] = []
                staticCubes.forEach(function(staticEl) {
                    if (staticEl.getFixd()[1] >= 10&&!this.isGameOver) {
                        this.isGameOver = true
                        alert("Game Over, your score is"+window.score)
                    }

                    function compare(i) {
                        return movingEl.getFixd()[i] - staticEl.getFixd()[i]
                    }

                    // Stores the distance between the small square and the static small squares below it to exclude transition interference, and the small square above it is not counted
                    if (!compare(0) && !compare(2) && compare(1) > 0 && movingEl.parent !== staticEl.parent) {
                        arr.bottomDistance[index].push(compare(1))
                    }

                    (!compare(0) && !compare(2) && compare(1) === 1 || movingEl.getFixd()[1] === -10) && (arr.bottom = true);
                    (!compare(0) && !compare(1) && compare(2) === -1 || movingEl.getFixd()[2] === 3) && (arr.far = true);
                    (!compare(0) && !compare(1) && compare(2) === 1 || movingEl.getFixd()[2] === -3) && (arr.near = true);
                    (!compare(2) && !compare(1) && compare(0) === 1 || movingEl.getFixd()[0] === -3) && (arr.left = true);
                    (!compare(2) && !compare(1) && compare(0) === -1 || movingEl.getFixd()[0] === 3) && (arr.right = true);

                    ( // After deformation, it overlaps with other blocks or protrudes out of the wall after deformation, and it is determined that this place cannot be deformed.
                        !compare(0) && !compare(1) && !compare(2) ||
                        movingEl.getFixd()[1] < -10 ||
                        movingEl.getFixd()[2] > 3 ||
                        movingEl.getFixd()[2] < -3 ||
                        movingEl.getFixd()[0] < -3 ||
                        movingEl.getFixd()[0] > 3
                    ) && (arr.canTransform = false)
                });
                if (!arr.bottomDistance[index].length) {
                    arr.bottomDistance[index] = movingEl.getFixd()[1] + 11
                } else {
                    arr.bottomDistance[index] = arr.bottomDistance[index].sort(function(a, b) {
                        return a - b
                    })[0]
                }
            });
            var temp = arr.bottomDistance
                // Take the distance of Rubik Cube from the settling point
            arr.bottomDistance = arr.bottomDistance.sort(function(a, b) {
                return a - b
            })[0]
        }
        return arr
    },
    
    // Determine the type and add a small square
    init: function(isclone, catagory) {
        if (!isclone) {
            this.catagory = this.catagories[Math.floor(Math.random() * 5)]
        } else {
            this.catagory = catagory
        }
        for (var i = 0; i < 4; i++) {
            var cube = new CellCube(this, isclone)
            if (this.catagory == "L") {
                if (i == 0) {
                    cube.position.x = 0
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 1) {
                    cube.position.x = 1
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 2) {
                    cube.position.x = 0
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 3) {
                    cube.position.x = 0
                    cube.position.y = 2
                    cube.position.z = 0
                }
            } else if (this.catagory == "X") {
                if (i == 0) {
                    cube.position.x = 0
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 1) {
                    cube.position.x = 1
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 2) {
                    cube.position.x = 0
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 3) {
                    cube.position.x = 1
                    cube.position.y = 1
                    cube.position.z = 0
                }
            } else if (this.catagory == "Z") {
                if (i == 0) {
                    cube.position.x = 0
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 1) {
                    cube.position.x = 0
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 2) {
                    cube.position.x = 1
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 3) {
                    cube.position.x = 1
                    cube.position.y = 2
                    cube.position.z = 0
                }
            } else if (this.catagory == "I") {
                if (i == 0) {
                    cube.position.x = 0
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 1) {
                    cube.position.x = 0
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 2) {
                    cube.position.x = 0
                    cube.position.y = 2
                    cube.position.z = 0
                } else if (i == 3) {
                    cube.position.x = 0
                    cube.position.y = 3
                    cube.position.z = 0
                }
            } else if (this.catagory == "T") {
                if (i == 0) {
                    cube.position.x = 0
                    cube.position.y = 0
                    cube.position.z = 0
                } else if (i == 1) {
                    cube.position.x = 0
                    cube.position.y = 1
                    cube.position.z = 0
                } else if (i == 2) {
                    cube.position.x = 0
                    cube.position.y = 2
                    cube.position.z = 0
                } else if (i == 3) {
                    cube.position.x = 1
                    cube.position.y = 1
                    cube.position.z = 0
                }
            }
            this.add(cube) // Add small blocks to the interior
        }
        this.position.set(0, 10, 0) // Put Rubik Cube on top of container
    },
    moveCtrl: function(e, p) {
            // The internal condition is visual follow judgment
        if (p.position.x == 3) {
            if (e.key == "d") {
                if (!this.collisionCheck().near) {
                    this.position.z -= 1
                }
            } else if (e.key == "s") {
                if (!this.collisionCheck().right) {
                    this.position.x += 1
                }
            } else if (e.key == "w") {
                if (!this.collisionCheck().left) {
                    this.position.x -= 1
                }
            } else if (e.key == "a") {
                if (!this.collisionCheck().far) {
                    this.position.z += 1
                }
            }
        } else if (p.position.x == -3) {
            if (e.key == "a") {
                if (!this.collisionCheck().near) {
                    this.position.z -= 1
                }
            } else if (e.key == "s") {
                if (!this.collisionCheck().left) {
                    this.position.x -= 1
                }
            } else if (e.key == "w") {
                if (!this.collisionCheck().right) {
                    this.position.x += 1
                }
            } else if (e.key == "d") {
                if (!this.collisionCheck().far) {
                    this.position.z += 1
                }
            }

        } else if (p.position.z == 3) {
            if (e.key == "a") {
                if (!this.collisionCheck().left) {
                    this.position.x -= 1
                }
            } else if (e.key == "s") {
                if (!this.collisionCheck().far) {
                    this.position.z += 1
                }
            } else if (e.key == "w") {
                if (!this.collisionCheck().near) {
                    this.position.z -= 1
                }
            } else if (e.key == "d") {
                if (!this.collisionCheck().right) {
                    this.position.x += 1
                }
            }
        } else if (p.position.z == -3) {
            if (e.key == "a") {
                if (!this.collisionCheck().right) {
                    this.position.x += 1
                }
            } else if (e.key == "s") {
                if (!this.collisionCheck().near) {
                    this.position.z -= 1
                }
            } else if (e.key == "w") {
                if (!this.collisionCheck().far) {
                    this.position.z += 1
                }
            } else if (e.key == "d") {
                if (!this.collisionCheck().left) {
                    this.position.x -= 1
                }
            }
        }
        if (e.key == "1") {
// Deformation: Cannot use the framework's own methods
// First deform, determine whether there is overlap
            this.children.forEach(function(el) {
                var temp = el.position.x
                el.position.x = el.position.y
                el.position.y = -temp
            });
            // If there is overlap after deformation, restore the state before deformation
            if (!this.collisionCheck().canTransform) {
                this.children.forEach(function(el) {
                    var temp = el.position.x
                    el.position.x = -el.position.y
                    el.position.y = temp
                });
            }
        } else if (e.key == "2") {
            // Transform first to determine whether there is overlap
            this.children.forEach(function(el) {
                var temp = el.position.x
                el.position.x = el.position.z
                el.position.z = -temp
            });
            // If there is overlap after deformation, restore the state before deformation
            if (!this.collisionCheck().canTransform) {
                this.children.forEach(function(el) {
                    var temp = el.position.x
                    el.position.x = -el.position.z
                    el.position.z = temp
                });
            }
        } else if (e.key == "3") {
            // Transform first to determine whether there is overlap
            this.children.forEach(function(el) {
                var temp = el.position.z
                el.position.z = el.position.y
                el.position.y = -temp
            });
            // If there is overlap after deformation, restore the state before deformation
            if (!this.collisionCheck().canTransform) {
                this.children.forEach(function(el) {
                    var temp = el.position.z
                    el.position.z = -el.position.y
                    el.position.y = temp
                });
            }
        } else if (e.key == " ") {
            this.drop("accelerate")
        } else if (e.key == "8") {
            this.pause()
        } else if (e.key == "7") {
            window.castShape = !window.castShape
        }
        if (this.moving && window.castShape) {
            this.castShape()
        } else {
            newoCan.remove(this.cast)
        }
    },
    __proto__: new THREE.Mesh()
}
