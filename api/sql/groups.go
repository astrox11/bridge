package database

type GroupMetadata struct {
	GroupID   string `gorm:"column:groupId;primaryKey"`
	SessionID string `gorm:"column:sessionId;not null"`
	GroupInfo string `gorm:"column:groupInfo"`
	UpdatedAt string `gorm:"column:updatedAt;not null"`
	CreatedAt string `gorm:"column:createdAt;not null"`
}

func (GroupMetadata) TableName() string {
	return "session_groups"
}

type GroupMetaDataResult struct {
	GroupID   string `json:"group_id" gorm:"column:groupId"`
	GroupInfo string `json:"group_info" gorm:"column:groupInfo"`
	UpdatedAt string `json:"updated_at" gorm:"column:updatedAt"`
	CreatedAt string `json:"created_at" gorm:"column:createdAt"`
}

func SaveGroup(group *GroupMetadata) error {
	return DB.Save(group).Error
}

func GetGroupsBySession(sessionID string) ([]GroupMetaDataResult, error) {
	var results []GroupMetaDataResult
	err := DB.Model(&GroupMetadata{}).
		Select("groupId, groupInfo, updatedAt, createdAt").
		Where("sessionId = ?", sessionID).
		Scan(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}

func GetAllGroupsMap(sessionID string) ([]GroupMetaDataResult, error) {
	return GetGroupsBySession(sessionID)
}

func DeleteGroup(groupID string) error {
	return DB.Where("groupId = ?", groupID).Delete(&GroupMetadata{}).Error
}
